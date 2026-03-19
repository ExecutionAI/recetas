export interface Receta {
  id: string
  nombre: string
  descripcion: string
  ingredientes: string[]
  pasos: string[]
  categoria: string
  tiempo_prep: string
  porciones: string
  imagen_url?: string   // legacy — kept for backward compat
  imagenes: string[]    // compressed base64 photos
  fuente: 'manual' | 'foto'
  createdAt: { seconds: number; nanoseconds: number } | null
}

export type RecetaInput = Omit<Receta, 'id' | 'createdAt'>
