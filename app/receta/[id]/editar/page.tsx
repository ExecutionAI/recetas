'use client'

import { useState, useRef, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Receta, RecetaInput } from '@/lib/types'

const CATEGORIAS = ['desayuno', 'sopa', 'guiso', 'antojito', 'postre', 'bebida', 'otro']

/* ── List editor ──────────────────────────────────────────────── */
function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  function update(idx: number, val: string) {
    const next = [...items]
    next[idx] = val
    onChange(next)
  }
  function add() { onChange([...items, '']) }
  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx)
    onChange(next.length ? next : [''])
  }
  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>{label}</label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <span className="text-sm shrink-0" style={{ color: '#A0846F', minWidth: '1.5rem', fontFamily: 'var(--font-body)', fontWeight: 700 }}>{idx + 1}.</span>
            <input className="input-receta flex-1" value={item} onChange={(e) => update(idx, e.target.value)} placeholder={placeholder + ' ' + String(idx + 1)} />
            {items.length > 1 && (
              <button type="button" onClick={() => remove(idx)} className="text-lg shrink-0 transition-opacity hover:opacity-60" style={{ color: '#A0846F' }}>×</button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="mt-2 text-sm font-bold transition-opacity hover:opacity-70" style={{ color: '#C4622D', fontFamily: 'var(--font-body)' }}>
        + Añadir otro
      </button>
    </div>
  )
}

/* ── Voice recorder hook ──────────────────────────────────────── */
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }
  }, [audioUrl])

  async function start() {
    chunksRef.current = []
    setAudioBlob(null)
    setAudioUrl(null)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    mediaRecorderRef.current = mr
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
      stream.getTracks().forEach((t) => t.stop())
    }
    mr.start()
    setRecording(true)
  }

  function stop() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setRecording(false)
  }

  return { recording, audioBlob, audioUrl, start, stop, reset }
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function EditarRecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [receta, setReceta] = useState<Receta | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<'manual' | 'voz'>('manual')

  // Manual edit form state
  const [form, setForm] = useState<Omit<RecetaInput, 'imagenes' | 'fuente'>>({
    nombre: '',
    descripcion: '',
    ingredientes: [''],
    pasos: [''],
    categoria: 'otro',
    tiempo_prep: '',
    porciones: '',
  })
  const [saving, setSaving] = useState(false)

  // Voice modification state
  const { recording, audioBlob, audioUrl, start, stop, reset } = useVoiceRecorder()
  const [applying, setApplying] = useState(false)
  const [transcripcion, setTranscripcion] = useState('')
  const [voiceApplied, setVoiceApplied] = useState(false)

  useEffect(() => {
    async function fetchReceta() {
      try {
        const snap = await getDoc(doc(db, 'recetas', id))
        if (!snap.exists()) {
          setNotFound(true)
        } else {
          const data = { id: snap.id, ...snap.data() } as Receta
          setReceta(data)
          setForm({
            nombre: data.nombre ?? '',
            descripcion: data.descripcion ?? '',
            ingredientes: data.ingredientes?.length ? data.ingredientes : [''],
            pasos: data.pasos?.length ? data.pasos : [''],
            categoria: data.categoria ?? 'otro',
            tiempo_prep: data.tiempo_prep ?? '',
            porciones: data.porciones ?? '',
          })
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

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const clean = {
        ...form,
        ingredientes: form.ingredientes.filter((s) => s.trim()),
        pasos: form.pasos.filter((s) => s.trim()),
      }
      await updateDoc(doc(db, 'recetas', id), clean)
      router.push(`/receta/${id}`)
    } catch (err) {
      console.error(err)
      alert('Error guardando los cambios. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function applyVoiceChange() {
    if (!audioBlob || !receta) return
    setApplying(true)
    try {
      const recetaJson = JSON.stringify({
        nombre: form.nombre,
        descripcion: form.descripcion,
        ingredientes: form.ingredientes,
        pasos: form.pasos,
        categoria: form.categoria,
        tiempo_prep: form.tiempo_prep,
        porciones: form.porciones,
      })
      const fd = new FormData()
      fd.append('audio', audioBlob, 'instruccion.webm')
      fd.append('receta', recetaJson)
      const res = await fetch('/api/modificar-receta', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setTranscripcion(json.transcripcion ?? '')
      setForm({
        nombre: json.nombre ?? form.nombre,
        descripcion: json.descripcion ?? form.descripcion,
        ingredientes: Array.isArray(json.ingredientes) && json.ingredientes.length ? json.ingredientes : form.ingredientes,
        pasos: Array.isArray(json.pasos) && json.pasos.length ? json.pasos : form.pasos,
        categoria: json.categoria ?? form.categoria,
        tiempo_prep: json.tiempo_prep ?? form.tiempo_prep,
        porciones: json.porciones ?? form.porciones,
      })
      setVoiceApplied(true)
      setTab('manual')
    } catch (err) {
      console.error(err)
      alert('No se pudo aplicar los cambios. Intenta de nuevo.')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FBF3E8' }}>
        <div className="w-10 h-10 rounded-full border-4 animate-spin" style={{ borderColor: '#E8D0B4', borderTopColor: '#C4622D' }} />
      </div>
    )
  }

  if (notFound || !receta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#FBF3E8' }}>
        <p className="text-4xl mb-4">🍽️</p>
        <h1 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-heading)', color: '#3D2B1F' }}>Receta no encontrada</h1>
        <button className="btn-primary" onClick={() => router.push('/')}>Volver al inicio</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBF3E8' }}>
      <header
        className="relative px-6 py-8 flex items-center"
        style={{ background: 'linear-gradient(160deg, #3D2B1F 0%, #6B4A38 100%)', borderBottom: '3px solid #C4622D' }}
      >
        <button onClick={() => router.push(`/receta/${id}`)} className="mr-4 text-2xl transition-opacity hover:opacity-70" style={{ color: '#E8D0B4' }}>←</button>
        <div>
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-heading)', color: '#FBF3E8', fontStyle: 'italic' }}>Editar Receta</h1>
          <p className="text-xs mt-0.5 italic" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>{receta.nombre}</p>
        </div>
      </header>

      <div className="sticky top-0 z-10 flex" style={{ background: '#F5E6D3', borderBottom: '1px solid #E8D0B4' }}>
        {(['manual', 'voz'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3.5 text-sm font-bold uppercase transition-colors"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.08em',
              color: tab === t ? '#C4622D' : '#A0846F',
              borderBottom: tab === t ? '2.5px solid #C4622D' : '2.5px solid transparent',
              background: tab === t ? '#FBF3E8' : 'transparent',
            }}
          >
            {t === 'manual' ? '✍️ Manual' : '🎙️ Modificar con Voz'}
          </button>
        ))}
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {tab === 'manual' && (
          <form onSubmit={handleSave} className="space-y-6">
            {voiceApplied && (
              <div className="rounded-xl p-3" style={{ background: '#7A8C5E18', border: '1px solid #7A8C5E44' }}>
                <p className="text-sm font-bold mb-1" style={{ color: '#7A8C5E', fontFamily: 'var(--font-body)' }}>
                  ✓ Cambios aplicados por IA · revisa antes de guardar
                </p>
                {transcripcion && (
                  <p className="text-xs italic" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>
                    "{transcripcion}"
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Nombre *</label>
              <input className="input-receta" value={form.nombre} onChange={(e) => setField('nombre', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Descripción</label>
              <textarea className="input-receta" rows={3} value={form.descripcion} onChange={(e) => setField('descripcion', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Categoría</label>
                <select className="input-receta" value={form.categoria} onChange={(e) => setField('categoria', e.target.value)}>
                  {CATEGORIAS.map((c) => (<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Tiempo</label>
                <input className="input-receta" value={form.tiempo_prep} onChange={(e) => setField('tiempo_prep', e.target.value)} placeholder="Ej. 45 min" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Porciones</label>
                <input className="input-receta" value={form.porciones} onChange={(e) => setField('porciones', e.target.value)} placeholder="Ej. 6 personas" />
              </div>
            </div>
            <ListEditor label="Ingredientes" items={form.ingredientes} onChange={(v) => setField('ingredientes', v)} placeholder="Ingrediente" />
            <ListEditor label="Pasos" items={form.pasos} onChange={(v) => setField('pasos', v)} placeholder="Paso" />
            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </form>
        )}

        {tab === 'voz' && (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="text-6xl mb-4">🎙️</div>
            <p className="text-base font-bold mb-1" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
              Explica qué quieres cambiar
            </p>
            <p className="text-sm mb-8 max-w-xs" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>
              Di algo como: "agrega más ajo", "quita la cebolla", "cambia el tiempo a 30 min"...
            </p>

            {!audioBlob && !recording && (
              <button
                onClick={start}
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-transform active:scale-95 hover:scale-105"
                style={{ background: '#C4622D', color: 'white', boxShadow: '0 4px 24px #C4622D55' }}
              >
                🎤
              </button>
            )}

            {recording && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-4xl"
                  style={{ background: '#C4622D', color: 'white' }}>
                  <span>🎤</span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full animate-ping" style={{ background: '#ef4444' }} />
                </div>
                <p className="text-sm font-bold animate-pulse" style={{ color: '#C4622D', fontFamily: 'var(--font-body)' }}>Grabando...</p>
                <button onClick={stop} className="btn-secondary px-6 py-2.5 text-sm font-bold">
                  ⏹ Detener
                </button>
              </div>
            )}

            {audioBlob && !recording && (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <audio src={audioUrl ?? undefined} controls className="w-full rounded-xl" style={{ accentColor: '#C4622D' }} />
                <div className="flex gap-3 w-full">
                  <button onClick={reset} className="btn-secondary flex-1 py-2.5 text-sm">
                    🔄 Grabar de nuevo
                  </button>
                  <button
                    onClick={applyVoiceChange}
                    disabled={applying}
                    className="btn-primary flex-1 py-2.5 text-sm"
                  >
                    {applying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 animate-spin inline-block" style={{ borderColor: '#E8D0B4', borderTopColor: 'transparent' }} />
                        Aplicando...
                      </span>
                    ) : '✨ Aplicar cambios'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
