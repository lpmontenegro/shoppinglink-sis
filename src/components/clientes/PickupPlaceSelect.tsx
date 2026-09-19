'use client'

import { useEffect, useState } from 'react'

type PickupPlace = {
  id: string
  name: string
  address: string
  responsible: string | null
}

const emptyForm = { name: '', description: '', address: '', responsible: '' }

export default function PickupPlaceSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [places, setPlaces] = useState<PickupPlace[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/pickup-places')
      .then((res) => res.json())
      .then(setPlaces)
      .catch(() => {})
  }, [])

  async function handleCreate() {
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/pickup-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        setError('No se pudo guardar el punto de recolección.')
        return
      }
      const created = await res.json()
      setPlaces((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      onChange(created.id)
      setCreating(false)
      setForm(emptyForm)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <select
        value={creating ? '__new__' : value}
        onChange={(e) => {
          if (e.target.value === '__new__') {
            setCreating(true)
          } else {
            setCreating(false)
            onChange(e.target.value)
          }
        }}
        className="w-full px-3 py-2 border border-brand-gray rounded"
      >
        <option value="">Seleccionar punto de recolección...</option>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value="__new__">+ Nuevo punto de recolección...</option>
      </select>

      {creating && (
        <div className="mt-2 p-3 border border-brand-gray rounded-lg bg-brand-gray-lt space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            required
            placeholder="Nombre (ej. Oficina zona 10)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
          <input
            placeholder="Descripción (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
          <input
            required
            placeholder="Dirección"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
          <input
            placeholder="Responsable (opcional)"
            value={form.responsible}
            onChange={(e) => setForm({ ...form, responsible: e.target.value })}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setCreating(false)
                setForm(emptyForm)
              }}
              className="text-sm text-brand-gray-dk"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !form.name || !form.address}
              onClick={handleCreate}
              className="text-sm px-3 py-1.5 bg-brand-blue text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar punto'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
