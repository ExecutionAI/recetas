import OpenAI from 'openai'

export async function POST(request: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    const recetaJson = formData.get('receta') as string | null

    if (!audio || !recetaJson) {
      return Response.json({ error: 'Faltan datos: audio o receta.' }, { status: 400 })
    }

    // Transcribe instruction with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'es',
    })

    const instruccion = transcription.text

    // Apply modification with GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Aquí está una receta en JSON:\n${recetaJson}\n\nEl usuario quiere hacer los siguientes cambios: "${instruccion}"\n\nDevuelve la receta completa modificada. Devuelve SOLO JSON válido, sin markdown, sin explicaciones.\n\nEl JSON debe tener exactamente estos campos:\n{\n  "nombre": "nombre de la receta",\n  "descripcion": "descripción breve",\n  "ingredientes": ["ingrediente 1 con cantidad"],\n  "pasos": ["paso 1 detallado"],\n  "categoria": "uno de: desayuno, sopa, guiso, antojito, postre, bebida, otro",\n  "tiempo_prep": "tiempo estimado",\n  "porciones": "número de porciones"\n}\n\nResponde en español.`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleaned)

    return Response.json({ ...parsed, transcripcion: instruccion })
  } catch (err) {
    console.error('Error modificando receta:', err)
    return Response.json(
      { error: 'No se pudo modificar la receta. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
