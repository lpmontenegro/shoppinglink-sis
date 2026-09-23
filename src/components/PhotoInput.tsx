'use client'

import { useRef, useState } from 'react'

// Redimensiona/comprime la foto en el teléfono antes de subirla — las fotos
// de cámara suelen pesar 3-5MB, esto las deja livianas (~200-400KB) para que
// no tarden en subir con datos móviles. Si algo falla, se sube el archivo
// original tal cual (mejor eso que bloquear al usuario).
async function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob-failed'))),
      'image/jpeg',
      quality
    )
  })
}

export default function PhotoInput({
  value,
  onChange,
  label = 'Foto',
}: {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [manualMode, setManualMode] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Elige un archivo de imagen')
      return
    }
    setError('')
    setUploading(true)
    try {
      const blob: Blob = await compressImage(file).catch(() => file)
      const form = new FormData()
      form.append('file', blob, 'foto.jpg')
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.url) {
        setError(data?.error || 'No se pudo subir la foto')
        return
      }
      onChange(data.url)
    } catch {
      setError('No se pudo subir la foto — revisa tu conexión')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-xs text-brand-gray-dk mb-1">{label}</label>
      <div className="flex items-center gap-2">
        {value ? (
          <img src={value} alt="" className="w-12 h-12 rounded object-cover border border-brand-gray shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded border border-dashed border-brand-gray shrink-0 flex items-center justify-center text-lg">
            📷
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-1.5 text-sm border border-brand-gray rounded text-brand-blue disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : value ? 'Cambiar foto' : 'Tomar / elegir foto'}
            </button>
            {value && !uploading && (
              <button type="button" onClick={() => onChange(null)} className="px-3 py-1.5 text-sm text-brand-gray-dk">
                Quitar
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setManualMode((v) => !v)}
            className="mt-1 text-xs text-brand-gray-dk underline"
          >
            {manualMode ? 'ocultar link manual' : 'o pega un link'}
          </button>
          {manualMode && (
            <input
              placeholder="https://..."
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value || null)}
              className="mt-1 w-full px-2 py-1 border border-brand-gray rounded text-xs"
            />
          )}
        </div>
      </div>
      {/* Sin el atributo "capture": así el navegador deja elegir entre tomar
          una foto nueva o escoger de la galería — con "capture" algunos
          Android saltan directo a la cámara y quitan la opción de galería. */}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
