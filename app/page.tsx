'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Receta } from '@/lib/types'

const CATEGORIAS: Record<string, string> = {
  desayuno: '🌅',
  sopa: '🍲',
  guiso: '🫕',
  antojito: '🌮',
  postre: '🍮',
  bebida: '☕',
  otro: '🍽️',
}

function RecetaCard({ receta, index }: { receta: Receta; index: number }) {
  return (
    <Link href={`/receta/${receta.id}`}>
      <article
        className="recipe-card fade-up bg-sand rounded-2xl overflow-hidden cursor-pointer"
        style={{
          animationDelay: `${index * 60}ms`,
          boxShadow: '0 2px 12px #3D2B1F14, 0 1px 4px #3D2B1F0A',
        }}
      >
        {/* Image */}
        <div
          className="relative w-full overflow-hidden"
          style={{ paddingBottom: '65%', background: '#E8D0B4' }}
        >
          {(receta.imagenes?.[0] ?? receta.imagen_url) ? (
            <img
              src={receta.imagenes?.[0] ?? receta.imagen_url}
              alt={receta.nombre}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span style={{ fontSize: '3rem', opacity: 0.4 }}>
                {CATEGORIAS[receta.categoria] ?? '🍽️'}
              </span>
            </div>
          )}
          {receta.fuente === 'foto' && (
            <span
              className="absolute top-2 right-2 text-xs font-bold uppercase px-2 py-0.5 rounded-full"
              style={{ background: '#C4622D', color: 'white', letterSpacing: '0.06em', fontFamily: 'var(--font-body)' }}
            >
              📷 foto
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: '#7A8C5E22',
                color: '#7A8C5E',
                letterSpacing: '0.1em',
                fontFamily: 'var(--font-body)',
              }}
            >
              {receta.categoria || 'otro'}
            </span>
            {receta.tiempo_prep && (
              <span className="text-xs" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>
                ⏱ {receta.tiempo_prep}
              </span>
            )}
          </div>
          <h2
            className="text-lg leading-snug mb-1"
            style={{ fontFamily: 'var(--font-heading)', color: '#3D2B1F', fontWeight: 700 }}
          >
            {receta.nombre}
          </h2>
          {receta.descripcion && (
            <p
              className="text-sm line-clamp-2"
              style={{ color: '#6B4A38', fontFamily: 'var(--font-body)' }}
            >
              {receta.descripcion}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 fade-up">
      <div className="text-6xl mb-6" style={{ filter: 'drop-shadow(0 4px 8px #C4622D33)' }}>
        📖
      </div>
      <h2
        className="text-2xl mb-2 text-center"
        style={{ fontFamily: 'var(--font-heading)', color: '#3D2B1F' }}
      >
        Aún no hay recetas
      </h2>
      <p
        className="text-center mb-8 max-w-sm"
        style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}
      >
        Empieza guardando la primera receta de la abuela. Escríbela a mano o sube una foto.
      </p>
      <Link href="/agregar">
        <button className="btn-primary">+ Agregar primera receta</button>
      </Link>
    </div>
  )
}

export default function GalleryPage() {
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaActiva, setCategoriaActiva] = useState<string>('')
  const [busquedaIng, setBusquedaIng] = useState<string>('')

  useEffect(() => {
    async function fetchRecetas() {
      try {
        const q = query(collection(db, 'recetas'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Receta))
        setRecetas(data)
      } catch (err) {
        console.error('Error cargando recetas:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchRecetas()
  }, [])

  const categoriasPresentes = Array.from(
    new Set(recetas.map((r) => r.categoria).filter(Boolean))
  ).sort()

  const recetasFiltradas = recetas.filter((r) => {
    const pasaCategoria = !categoriaActiva || r.categoria === categoriaActiva
    const termino = busquedaIng.trim().toLowerCase()
    const pasaIngrediente =
      !termino ||
      r.ingredientes?.some((ing) => ing.toLowerCase().includes(termino)) ||
      r.nombre.toLowerCase().includes(termino)
    return pasaCategoria && pasaIngrediente
  })

  return (
    <div className="min-h-screen" style={{ background: '#FBF3E8' }}>
      {/* Header */}
      <header
        className="noise-texture text-center py-14 px-6 relative"
        style={{ background: 'linear-gradient(160deg, #3D2B1F 0%, #6B4A38 60%, #9E4E24 100%)' }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #C4622D, #E8D0B4, #7A8C5E, #E8D0B4, #C4622D)',
          }}
        />
        <p
          className="uppercase text-xs mb-3"
          style={{ color: '#E8D0B4', fontFamily: 'var(--font-body)', letterSpacing: '0.25em' }}
        >
          ✦ Tesoro de familia ✦
        </p>
        <h1
          className="text-5xl md:text-6xl mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: '#FBF3E8', textShadow: '0 2px 16px #00000033', fontStyle: 'italic' }}
        >
          Las Recetas
        </h1>
        <h1
          className="text-4xl md:text-5xl mb-6"
          style={{ fontFamily: 'var(--font-heading)', color: '#E8C9A0', textShadow: '0 2px 12px #00000033' }}
        >
          de la Abuela
        </h1>
        <div className="flex items-center justify-center gap-3 mb-8">
          <div style={{ height: '1px', width: '60px', background: '#E8D0B455' }} />
          <span style={{ color: '#C4622D', fontSize: '1.1rem' }}>✦</span>
          <div style={{ height: '1px', width: '60px', background: '#E8D0B455' }} />
        </div>
        <Link href="/agregar">
          <button className="btn-primary" style={{ paddingLeft: '2rem', paddingRight: '2rem', fontSize: '0.95rem', letterSpacing: '0.06em' }}>
            + Agregar Receta
          </button>
        </Link>
      </header>

      {/* Filter bar */}
      {!loading && recetas.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2 flex flex-col gap-3">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoriaActiva('')}
              className="text-xs uppercase font-bold px-3 py-1.5 rounded-full transition-all"
              style={{
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.08em',
                background: !categoriaActiva ? '#C4622D' : '#E8D0B4',
                color: !categoriaActiva ? 'white' : '#6B4A38',
              }}
            >
              Todas
            </button>
            {categoriasPresentes.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat === categoriaActiva ? '' : cat)}
                className="text-xs uppercase font-bold px-3 py-1.5 rounded-full transition-all"
                style={{
                  fontFamily: 'var(--font-body)',
                  letterSpacing: '0.08em',
                  background: cat === categoriaActiva ? '#C4622D' : '#E8D0B4',
                  color: cat === categoriaActiva ? 'white' : '#6B4A38',
                }}
              >
                {CATEGORIAS[cat] ?? '🍽️'} {cat}
              </button>
            ))}
          </div>

          {/* Ingredient search */}
          <div className="relative max-w-sm">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: '#A0846F' }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por ingrediente…"
              value={busquedaIng}
              onChange={(e) => setBusquedaIng(e.target.value)}
              className="w-full pl-8 pr-4 py-2 rounded-full text-sm outline-none"
              style={{
                fontFamily: 'var(--font-body)',
                background: '#F5E6D3',
                border: '1.5px solid #E8D0B4',
                color: '#3D2B1F',
              }}
            />
            {busquedaIng && (
              <button
                onClick={() => setBusquedaIng('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: '#A0846F' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Result count */}
          <p style={{ color: '#A0846F', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
            {recetasFiltradas.length} {recetasFiltradas.length === 1 ? 'receta' : 'recetas'}
            {(categoriaActiva || busquedaIng) ? ' encontradas' : ' guardadas'}
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-20">
        {loading ? (
          <div className="flex justify-center py-24">
            <div
              className="w-10 h-10 rounded-full border-4 animate-spin"
              style={{ borderColor: '#E8D0B4', borderTopColor: '#C4622D' }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recetas.length === 0 ? (
              <EmptyState />
            ) : recetasFiltradas.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 fade-up">
                <p className="text-4xl mb-4">🔍</p>
                <p style={{ color: '#A0846F', fontFamily: 'var(--font-body)', fontSize: '1rem' }}>
                  No hay recetas con ese filtro.
                </p>
              </div>
            ) : (
              recetasFiltradas.map((receta, i) => (
                <RecetaCard key={receta.id} receta={receta} index={i} />
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="text-center py-8 mt-4"
        style={{ borderTop: '1px solid #E8D0B4', color: '#A0846F', fontFamily: 'var(--font-body)', fontSize: '0.8rem', letterSpacing: '0.04em' }}
      >
        ✦ Con amor, para siempre ✦
      </footer>
    </div>
  )
}
