import OpenAI from 'openai'

const PROMPT = `El usuario te ha dictado una receta en voz. A continuación encontrarás la transcripción.
Extrae la información y devuelve SOLO JSON válido, sin markdown, sin explicaciones, sin bloques de código.

El JSON debe tener exactamente estos campos:
{
  "nombre": "nombre de la receta",
  "descripcion": "descripción breve de la receta (1-2 oraciones)",
  "ingredientes": ["ingrediente 1 con cantidad", "ingrediente 2 con cantidad"],
  "pasos": ["paso 1 detallado", "paso 2 detallado"],
  "categoria": "uno de: desayuno, sopa, guiso, antojito, postre, bebida, otro",
  "tiempo_prep": "tiempo total estimado, ej: 45 min",
  "porciones": "número de porciones, ej: 4 personas"
}

Si un campo no se puede determinar de la transcripción, usa una cadena vacía o arreglo vacío.
Responde en español.`

export async function POST(request: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return Response.json({ error: 'No se recibió ningún audio.' }, { status: 400 })
    }

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: 'whisper-1',
      language: 'es',
    })

    const texto = transcription.text

    // Structure with GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `${PROMPT}\n\nTranscripción:\n${texto}`,
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleaned)

    return Response.json({ ...parsed, transcripcion: texto })
  } catch (err) {
    console.error('Error analizando voz:', err)
    return Response.json(
      { error: 'No se pudo analizar el audio. Intenta de nuevo.' },
      { status: 500 }
    )
  }
}
