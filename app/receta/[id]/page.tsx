'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Receta } from '@/lib/types'

export default function RecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [receta, setReceta] = useState<Receta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchReceta() {
      try {
        const snap = await getDoc(doc(db, 'recetas', id))
        if (!snap.exists()) {
          setNotFound(true)
        } else {
          setReceta({ id: snap.id, ...snap.data() } as Receta)
        }
      } catch (err) {
        console.error(err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    fetchReceta()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF3E8' }}>
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin"
          style={{ borderColor: '#E8D0B4', borderTopColor: '#C4622D' }}
        />
      </div>
    )
  }

  if (notFound || !receta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#FBF3E8' }}>
        <p className="text-4xl mb-4">🍽️</p>
        <h1 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-heading)', color: '#3D2B1F' }}>
          Receta no encontrada
        </h1>
        <button className="btn-primary" onClick={() => router.push('/')}>
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBF3E8' }}>
      {/* Hero header */}
      <header
        className="relative"
        style={{
          background: 'linear-gradient(160deg, #3D2B1F 0%, #6B4A38 60%, #9E4E24 100%)',
          minHeight: '280px',
        }}
      >
        {/* Decorative top stripe */}
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

        {/* Background image if available */}
        {(receta.imagenes?.[0] ?? receta.imagen_url) && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${(receta.imagenes?.[0] ?? receta.imagen_url)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.2,
            }}
          />
        )}

        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-6 left-6 transition-opacity hover:opacity-70"
          style={{ color: '#E8D0B4', fontSize: '1.5rem', zIndex: 20 }}
        >
          ←
        </button>

        {/* Edit button */}
        <button
          onClick={() => router.push(`/receta/${id}/editar`)}
          className="absolute top-6 right-6 transition-opacity hover:opacity-70 text-sm font-bold px-3 py-1 rounded-full"
          style={{ background: '#C4622D88', color: '#FBF3E8', fontFamily: 'var(--font-body)', border: '1px solid #E8D0B466', zIndex: 20 }}
        >
          ✏️ Editar
        </button>

        {/* Content */}
        <div className="relative px-6 pb-10 pt-16 text-center">
          {/* Category + source badges */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {receta.categoria && (
              <span
                className="text-xs uppercase font-bold px-3 py-1 rounded-full"
                style={{
                  background: '#7A8C5E44',
                  color: '#C8DBA8',
                  letterSpacing: '0.1em',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {receta.categoria}
              </span>
            )}
            {receta.fuente === 'foto' && (
              <span
                className="text-xs uppercase font-bold px-3 py-1 rounded-full"
                style={{
                  background: '#C4622D44',
                  color: '#F5C8A8',
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--font-body)',
                }}
              >
                📷 foto
              </span>
            )}
          </div>

          <h1
            className="text-4xl md:text-5xl leading-tight mb-4 fade-up"
            style={{
              fontFamily: 'var(--font-heading)',
              color: '#FBF3E8',
              fontStyle: 'italic',
              textShadow: '0 2px 16px #00000044',
            }}
          >
            {receta.nombre}
          </h1>

          {receta.descripcion && (
            <p
              className="max-w-xl mx-auto text-base leading-relaxed fade-up"
              style={{ color: '#E8C9A0', fontFamily: 'var(--font-body)', animationDelay: '80ms' }}
            >
              {receta.descripcion}
            </p>
          )}

          {/* Metadata chips */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 fade-up" style={{ animationDelay: '140ms' }}>
            {receta.tiempo_prep && (
              <div className="flex items-center gap-1.5" style={{ color: '#E8D0B4', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
                <span>⏱</span>
                <span>{receta.tiempo_prep}</span>
              </div>
            )}
            {receta.porciones && (
              <div className="flex items-center gap-1.5" style={{ color: '#E8D0B4', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
                <span>👥</span>
                <span>{receta.porciones}</span>
              </div>
            )}
            {receta.ingredientes?.length > 0 && (
              <div className="flex items-center gap-1.5" style={{ color: '#E8D0B4', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
                <span>🧂</span>
                <span>{receta.ingredientes.length} ingredientes</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main image below header if available */}
      {(receta.imagenes?.[0] ?? receta.imagen_url) && (
        <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10 mb-2">
          <img
            src={(receta.imagenes?.[0] ?? receta.imagen_url)}
            alt={receta.nombre}
            className="w-full rounded-2xl object-cover"
            style={{ maxHeight: '360px', boxShadow: '0 8px 32px #3D2B1F33' }}
          />
        </div>
      )}


      {/* Image gallery — shown when more than 1 image */}
      {(receta.imagenes?.length ?? 0) > 1 && (
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {receta.imagenes.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={'foto ' + String(i + 1)}
                className="rounded-xl object-cover shrink-0 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                style={{ width: 96, height: 96, border: i === 0 ? '2px solid #C4622D' : '2px solid transparent' }}
              />
            ))}
          </div>
        </div>
      )}
      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Ingredients */}
          {receta.ingredientes?.length > 0 && (
            <section className="fade-up" style={{ animationDelay: '100ms' }}>
              <div className="divider-ornamental mb-5">
                <h2 className="text-xl whitespace-nowrap" style={{ fontFamily: 'var(--font-heading)', color: '#3D2B1F' }}>
                  Ingredientes
                </h2>
              </div>
              <ul className="space-y-2.5">
                {receta.ingredientes.map((ing, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="shrink-0 w-5 h-5 rounded-full mt-0.5 flex items-center justify-center text-xs font-bold"
                      style={{ background: '#C4622D22', color: '#C4622D' }}
                    >
                      ✓
                    </span>
                    <span style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)', lineHeight: '1.5' }}>
                      {ing}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Steps */}
          {receta.pasos?.length > 0 && (
            <section className="fade-up" style={{ animationDelay: '180ms' }}>
              <div className="divider-ornamental mb-5">
                <h2 className="text-xl whitespace-nowrap" style={{ fontFamily: 'var(--font-heading)', color: '#3D2B1F' }}>
                  Preparación
                </h2>
              </div>
              <ol className="space-y-4">
                {receta.pasos.map((paso, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: '#C4622D',
                        color: 'white',
                        fontFamily: 'var(--font-body)',
                        boxShadow: '0 2px 8px #C4622D44',
                      }}
                    >
                      {i + 1}
                    </span>
                    <p style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)', lineHeight: '1.65', paddingTop: '2px' }}>
                      {paso}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Divider */}
        <div className="my-10 flex items-center gap-3">
          <div style={{ flex: 1, height: '1px', background: '#E8D0B4' }} />
          <span style={{ color: '#C4622D', fontSize: '1rem' }}>✦</span>
          <div style={{ flex: 1, height: '1px', background: '#E8D0B4' }} />
        </div>

        {/* Back button */}
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="btn-secondary"
          >
            ← Ver todas las recetas
          </button>
        </div>
      </main>
    </div>
  )
}
