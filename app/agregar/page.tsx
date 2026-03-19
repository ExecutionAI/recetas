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
  imagen_url: '',
  fuente: 'manual',
}

/* ── Shared list editor ─────────────────────────────────────── */
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
  function add() {
    onChange([...items, ''])
  }
  function remove(idx: number) {
    const next = items.filter((_, i) => i !== idx)
    onChange(next.length ? next : [''])
  }

  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <span className="text-sm shrink-0" style={{ color: '#A0846F', minWidth: '1.5rem', fontFamily: 'var(--font-body)', fontWeight: 700 }}>
              {idx + 1}.
            </span>
            <input
              className="input-receta flex-1"
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              placeholder={`${placeholder} ${idx + 1}`}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-lg shrink-0 transition-opacity hover:opacity-60"
                style={{ color: '#A0846F' }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-sm font-bold transition-opacity hover:opacity-70"
        style={{ color: '#C4622D', fontFamily: 'var(--font-body)' }}
      >
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
      {/* Nombre */}
      <div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
          Nombre de la receta *
        </label>
        <input
          className="input-receta"
          value={form.nombre}
          onChange={(e) => set('nombre', e.target.value)}
          placeholder="Ej. Mole negro de la abuela"
          required
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
          Descripción
        </label>
        <textarea
          className="input-receta"
          rows={3}
          value={form.descripcion}
          onChange={(e) => set('descripcion', e.target.value)}
          placeholder="Un platillo especial que la abuela preparaba en ocasiones especiales..."
          style={{ resize: 'vertical' }}
        />
      </div>

      {/* Categoría + Tiempo + Porciones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
            Categoría
          </label>
          <select
            className="input-receta"
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
            Tiempo
          </label>
          <input
            className="input-receta"
            value={form.tiempo_prep}
            onChange={(e) => set('tiempo_prep', e.target.value)}
            placeholder="Ej. 45 min"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
            Porciones
          </label>
          <input
            className="input-receta"
            value={form.porciones}
            onChange={(e) => set('porciones', e.target.value)}
            placeholder="Ej. 6 personas"
          />
        </div>
      </div>

      {/* Ingredientes */}
      <ListEditor
        label="Ingredientes"
        items={form.ingredientes}
        onChange={(v) => set('ingredientes', v)}
        placeholder="Ingrediente"
      />

      {/* Pasos */}
      <ListEditor
        label="Pasos"
        items={form.pasos}
        onChange={(v) => set('pasos', v)}
        placeholder="Paso"
      />

      {/* URL de imagen */}
      <div>
        <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
          URL de imagen <span style={{ color: '#A0846F', fontWeight: 400 }}>(opcional)</span>
        </label>
        <input
          className="input-receta"
          value={form.imagen_url}
          onChange={(e) => set('imagen_url', e.target.value)}
          placeholder="https://..."
          type="url"
        />
      </div>

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
  const [preview, setPreview] = useState<string | null>(null)
  const [form, setForm] = useState<RecetaInput | null>(null)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrag(e: DragEvent) {
    e.preventDefault()
    setDragging(e.type === 'dragover')
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor sube una imagen.')
      return
    }

    // Local preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Analyze
    setAnalyzing(true)
    setForm(null)
    try {
      const fd = new FormData()
      fd.append('imagen', file)
      const res = await fetch('/api/analizar-foto', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      setForm({
        ...EMPTY_FORM,
        ...json,
        ingredientes: Array.isArray(json.ingredientes) && json.ingredientes.length ? json.ingredientes : [''],
        pasos: Array.isArray(json.pasos) && json.pasos.length ? json.pasos : [''],
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
      {/* Drop zone */}
      {!form && (
        <div
          className={`drop-zone ${dragging ? 'dragging' : ''} flex flex-col items-center justify-center py-16 px-8 text-center mb-6`}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {analyzing ? (
            <>
              <div
                className="w-12 h-12 rounded-full border-4 animate-spin mb-4"
                style={{ borderColor: '#E8D0B4', borderTopColor: '#C4622D' }}
              />
              <p className="text-base font-bold" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
                Analizando con IA...
              </p>
              <p className="text-sm mt-1" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>
                Extrayendo ingredientes y pasos
              </p>
            </>
          ) : preview ? (
            <img src={preview} alt="preview" className="max-h-48 rounded-xl object-cover mb-4" />
          ) : (
            <>
              <div className="text-5xl mb-4">📸</div>
              <p className="text-base font-bold mb-1" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
                Arrastra una foto aquí
              </p>
              <p className="text-sm" style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}>
                o haz clic para seleccionar
              </p>
            </>
          )}
        </div>
      )}

      {/* Review form after analysis */}
      {form && (
        <div className="fade-up">
          <div
            className="flex items-center gap-3 rounded-xl p-3 mb-6"
            style={{ background: '#7A8C5E18', border: '1px solid #7A8C5E44' }}
          >
            {preview && (
              <img src={preview} alt="preview" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold" style={{ color: '#7A8C5E', fontFamily: 'var(--font-body)' }}>
                ✓ IA extrajo la receta — revisa y edita antes de guardar
              </p>
              <button
                type="button"
                className="text-xs mt-0.5 underline"
                style={{ color: '#A0846F', fontFamily: 'var(--font-body)' }}
                onClick={() => { setForm(null); setPreview(null) }}
              >
                Usar otra foto
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
                Nombre *
              </label>
              <input className="input-receta" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1.5" style={{ color: '#3D2B1F', fontFamily: 'var(--font-body)' }}>
                Descripción
              </label>
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

  function onSuccess() {
    router.push('/')
  }

  return (
    <div className="min-h-screen" style={{ background: '#FBF3E8' }}>
      {/* Header */}
      <header
        className="relative px-6 py-8 flex items-center"
        style={{
          background: 'linear-gradient(160deg, #3D2B1F 0%, #6B4A38 100%)',
          borderBottom: '3px solid #C4622D',
        }}
      >
        <button
          onClick={() => router.back()}
          className="mr-4 text-2xl transition-opacity hover:opacity-70"
          style={{ color: '#E8D0B4' }}
        >
          ←
        </button>
        <div>
          <h1
            className="text-2xl"
            style={{ fontFamily: 'var(--font-heading)', color: '#FBF3E8', fontStyle: 'italic' }}
          >
            Agregar Receta
          </h1>
          <p className="text-xs mt-0.5" style={{ color: '#A0846F', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>
            Las Recetas de la Abuela
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div
        className="sticky top-0 z-10 flex"
        style={{ background: '#F5E6D3', borderBottom: '1px solid #E8D0B4' }}
      >
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

      {/* Form content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {tab === 'manual' ? (
          <ManualForm onSuccess={onSuccess} />
        ) : (
          <FotoForm onSuccess={onSuccess} />
        )}
      </main>
    </div>
  )
}
