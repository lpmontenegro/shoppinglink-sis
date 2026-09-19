'use client'

import { useEffect, useState } from 'react'

type UsAddress = {
  id: string
  name: string
  addressLine: string
  city: string
  state: string
  zip: string
  phone: string | null
}

const emptyForm = {
  name: '',
  description: '',
  addressLine: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
}

export default function UsAddressSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [addresses, setAddresses] = useState<UsAddress[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/us-addresses')
      .then((res) => res.json())
      .then(setAddresses)
      .catch(() => {})
  }, [])

  async function handleCreate() {
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/us-addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        setError('No se pudo guardar la dirección.')
        return
      }
      const created = await res.json()
      setAddresses((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
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
        <option value="">Seleccionar dirección en USA...</option>
        {addresses.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} — {a.city}, {a.state}
          </option>
        ))}
        <option value="__new__">+ Nueva dirección...</option>
      </select>

      {creating && (
        <div className="mt-2 p-3 border border-brand-gray rounded-lg bg-brand-gray-lt space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            required
            placeholder="Nombre (ej. Bodega Miami)"
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
            value={form.addressLine}
            onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              required
              placeholder="Ciudad"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="px-3 py-2 border border-brand-gray rounded"
            />
            <input
              required
              placeholder="Estado"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="px-3 py-2 border border-brand-gray rounded"
            />
            <input
              required
              placeholder="Zip"
              value={form.zip}
              onChange={(e) => setForm({ ...form, zip: e.target.value })}
              className="px-3 py-2 border border-brand-gray rounded"
            />
          </div>
          <input
            placeholder="Teléfono en USA (opcional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              disabled={saving || !form.name || !form.addressLine || !form.city || !form.state || !form.zip}
              onClick={handleCreate}
              className="text-sm px-3 py-1.5 bg-brand-blue text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar dirección'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
