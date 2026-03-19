'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { RecetaInput } from '@/lib/types'

const CATEGORIAS = ['desayuno', 'sopa', 'guiso', 'antojito', 'postre', 'bebida', 'otro']

const EMPTY_FORM: RecetaInput = {
  nombre: '',
  descripcion: '',
  ingredientes: [''],
  pasos: [''],
  categoria: 'otro',
  tiempo_prep: '',
  porciones: '',
  imagenes: [],
  fuente: 'manual',
}

/* ── Image compression ───────────────────────────────────────── */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 800
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.src = url
  })
}

/* ── Multi-image uploader ─────────────────────────────────────── */
function ImagenUploader({
  imagenes,
  onChange,
  label = 'Fotos',
}: {
  imagenes: string[]
  onChange: (imgs: string[]) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)

  async function handleFiles(files: FileList) {
    setCompressing(true)
    try {
      const compressed = await Promise.all(
        Array.from(files).filter((f) => f.type.startsWith('image/')).map(compressImage)
      )
      onChange([...imagenes, ...compressed])
    } finally {
      setCompressing(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
        {label} <span style={{ color: '#A0846F', fontWeight: 400 }}>(opcional)</span>
      </label>
      {imagenes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {imagenes.map((src, i) => (
            <div key={i} className="relative group" style={{ width: 80, height: 80 }}>
              <img src={src} alt={'foto ' + String(i + 1)} className="w-full h-full object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => onChange(imagenes.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: '#C4622D', color: 'white' }}
              >
                ×
              </button>
              {i === 0 && (
                <span
                  className="absolute bottom-0 left-0 right-0 text-center py-0.5 rounded-b-lg"
                  style={{ background: '#00000066', color: 'white', fontSize: '0.6rem' }}
                >
                  portada
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={compressing}
        className="btn-secondary text-sm py-2 px-4"
      >
        {compressing ? 'Comprimiendo...' : imagenes.length === 0 ? '📷 Agregar fotos' : '📷 Agregar más fotos'}
      </button>
      {imagenes.length > 0 && (
        <p className="text-xs mt-1" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>
          {imagenes.length} foto{imagenes.length !== 1 ? 's' : ''} · La primera será la portada
        </p>
      )}
    </div>
  )
}

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

/* ── Manual form ─────────────────────────────────────────────── */
function ManualForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState<RecetaInput>({ ...EMPTY_FORM, fuente: 'manual' })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof RecetaInput>(key: K, val: RecetaInput[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const clean = {
        ...form,
        ingredientes: form.ingredientes.filter((s) => s.trim()),
        pasos: form.pasos.filter((s) => s.trim()),
      }
      await addDoc(collection(db, 'recetas'), { ...clean, createdAt: serverTimestamp() })
      onSuccess()
    } catch (err) {
      console.error(err)
      alert('Error guardando la receta. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Nombre de la receta *</label>
        <input className="input-receta" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej. Mole negro de la abuela" required />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Descripción</label>
        <textarea className="input-receta" rows={3} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Un platillo especial que la abuela preparaba..." style={{ resize: 'vertical' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Categoría</label>
          <select className="input-receta" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {CATEGORIAS.map((c) => (<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Tiempo</label>
          <input className="input-receta" value={form.tiempo_prep} onChange={(e) => set('tiempo_prep', e.target.value)} placeholder="Ej. 45 min" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Porciones</label>
          <input className="input-receta" value={form.porciones} onChange={(e) => set('porciones', e.target.value)} placeholder="Ej. 6 personas" />
        </div>
      </div>
      <ListEditor label="Ingredientes" items={form.ingredientes} onChange={(v) => set('ingredientes', v)} placeholder="Ingrediente" />
      <ListEditor label="Pasos" items={form.pasos} onChange={(v) => set('pasos', v)} placeholder="Paso" />
      <ImagenUploader label="Fotos de la receta" imagenes={form.imagenes} onChange={(imgs) => set('imagenes', imgs)} />
      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={saving}>
        {saving ? 'Guardando...' : '💾 Guardar receta'}
      </button>
    </form>
  )
}

/* ── Photo form ──────────────────────────────────────────────── */
function FotoForm({ onSuccess }: { onSuccess: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [form, setForm] = useState<RecetaInput | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrag(e: DragEvent) { e.preventDefault(); setDragging(e.type === 'dragover') }
  async function handleDrop(e: DragEvent) { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files) }
  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) { if (e.target.files?.length) processFiles(e.target.files) }

  async function processFiles(files: FileList) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) { alert('Por favor sube imágenes.'); return }
    setAnalyzing(true)
    setForm(null)
    const compressed = await Promise.all(imageFiles.map(compressImage))
    try {
      const fd = new FormData()
      fd.append('imagen', imageFiles[0])
      const res = await fetch('/api/analizar-foto', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setForm({
        ...EMPTY_FORM,
        ...json,
        ingredientes: Array.isArray(json.ingredientes) && json.ingredientes.length ? json.ingredientes : [''],
        pasos: Array.isArray(json.pasos) && json.pasos.length ? json.pasos : [''],
        imagenes: compressed,
        fuente: 'foto',
      })
    } catch (err) {
      console.error(err)
      alert('No se pudo analizar la imagen. Intenta con otra foto.')
    } finally {
      setAnalyzing(false)
    }
  }

  function set<K extends keyof RecetaInput>(key: K, val: RecetaInput[K]) {
    setForm((f) => f ? { ...f, [key]: val } : f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form || !form.nombre.trim()) return
    setSaving(true)
    try {
      const clean = {
        ...form,
        ingredientes: form.ingredientes.filter((s) => s.trim()),
        pasos: form.pasos.filter((s) => s.trim()),
      }
      await addDoc(collection(db, 'recetas'), { ...clean, createdAt: serverTimestamp() })
      onSuccess()
    } catch (err) {
      console.error(err)
      alert('Error guardando la receta. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {!form && (
        <div
          className={'drop-zone ' + (dragging ? 'dragging' : '') + ' flex flex-col items-center justify-center py-16 px-8 text-center mb-6'}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => !analyzing && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          {analyzing ? (
            <>
              <div className="w-12 h-12 rounded-full border-4 animate-spin mb-4" style={{ borderColor: '#E8D0B4', borderTopColor: '#C4622D' }} />
              <p className="text-base font-bold" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Analizando con IA...</p>
              <p className="text-sm mt-1" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>Extrayendo receta de la primera foto</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">📸</div>
              <p className="text-base font-bold mb-1" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Arrastra una o varias fotos aquí</p>
              <p className="text-sm" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>o haz clic para seleccionar · puedes elegir varias a la vez</p>
            </>
          )}
        </div>
      )}
      {form && (
        <div className="fade-up">
          <div className="rounded-xl p-3 mb-6" style={{ background: '#7A8C5E18', border: '1px solid #7A8C5E44' }}>
            <p className="text-sm font-bold mb-2" style={{ color: '#7A8C5E', fontFamily: 'var(--font-body)' }}>
              ✓ IA extrajo la receta · revisa y edita antes de guardar
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.imagenes.map((src, i) => (
                <div key={i} className="relative group" style={{ width: 72, height: 72 }}>
                  <img src={src} alt={'foto ' + String(i + 1)} className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => set('imagenes', form.imagenes.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: '#C4622D', color: 'white' }}
                  >×</button>
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 text-center py-0.5 rounded-b-lg" style={{ background: '#00000066', color: 'white', fontSize: '0.6rem' }}>portada</span>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="text-xs underline" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }} onClick={() => setForm(null)}>
              Empezar de nuevo
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Nombre *</label>
              <input className="input-receta" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Descripción</label>
              <textarea className="input-receta" rows={3} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Categoría</label>
                <select className="input-receta" value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
                  {CATEGORIAS.map((c) => (<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Tiempo</label>
                <input className="input-receta" value={form.tiempo_prep} onChange={(e) => set('tiempo_prep', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>Porciones</label>
                <input className="input-receta" value={form.porciones} onChange={(e) => set('porciones', e.target.value)} />
              </div>
            </div>
            <ListEditor label="Ingredientes" items={form.ingredientes} onChange={(v) => set('ingredientes', v)} placeholder="Ingrediente" />
            <ListEditor label="Pasos" items={form.pasos} onChange={(v) => set('pasos', v)} placeholder="Paso" />
            <button type="submit" className="btn-primary w-full py-3 text-base" disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar receta'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function AgregarPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'manual' | 'foto'>('manual')
  return (
    <div className="min-h-screen" style={{ background: '#FBF3E8' }}>
      <header
        className="relative px-6 py-8 flex items-center"
        style={{ background: 'linear-gradient(160deg, #3D2B1F 0%, #6B4A38 100%)', borderBottom: '3px solid #C4622D' }}
      >
        <button onClick={() => router.back()} className="mr-4 text-2xl transition-opacity hover:opacity-70" style={{ color: '#E8D0B4' }}>←</button>
        <div>
          <h1 className="text-2xl" style={{ fontFamily: 'var(--font-heading)', color: '#FBF3E8', fontStyle: 'italic' }}>Agregar Receta</h1>
          <p className="text-xs mt-0.5" style={{ color: '#A0846F', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>Las Recetas de la Abuela</p>
        </div>
      </header>
      <div className="sticky top-0 z-10 flex" style={{ background: '#F5E6D3', borderBottom: '1px solid #E8D0B4' }}>
        {(['manual', 'foto'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3.5 text-sm font-bold uppercase transition-colors"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.1em',
              color: tab === t ? '#C4622D' : '#A0846F',
              borderBottom: tab === t ? '2.5px solid #C4622D' : '2.5px solid transparent',
              background: tab === t ? '#FBF3E8' : 'transparent',
            }}
          >
            {t === 'manual' ? '✍️ Escribir' : '📷 Foto'}
          </button>
        ))}
      </div>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {tab === 'manual' ? <ManualForm onSuccess={() => router.push('/')} /> : <FotoForm onSuccess={() => router.push('/')} />}
      </main>
    </div>
  )
}
