import OpenAI from 'openai'

const PROMPT = `Analiza estas imágenes de receta y extrae la información en JSON.
Pueden ser varias fotos de la misma receta (portada, ingredientes, pasos, etc.) — úsalas todas juntas.
Devuelve SOLO JSON válido, sin markdown, sin explicaciones, sin bloques de código.

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

Si un campo no se puede determinar de la imagen, usa una cadena vacía o arreglo vacío.
Responde en español.`

export async function POST(request: Request) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  try {
    const formData = await request.formData()
    const files = formData.getAll('imagen') as File[]

    if (files.length === 0) {
      return Response.json({ error: 'No se recibió ninguna imagen.' }, { status: 400 })
    }

    const imageBlocks = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        const mimeType = file.type || 'image/jpeg'
        return {
          type: 'image_url' as const,
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' as const },
        }
      })
    )

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            ...imageBlocks,
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    const parsed = JSON.parse(cleaned)
    return Response.json(parsed)
  } catch (err) {
    console.error('Error analizando foto:', err)
    return Response.json(
      { error: 'No se pudo analizar la imagen. Intenta con otra foto.' },
      { status: 500 }
    )
  }
}
