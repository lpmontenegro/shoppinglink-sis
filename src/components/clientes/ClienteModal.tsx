'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'

type Cliente = {
  id: string
  fullName: string
  phones: string[]
  deliveryAddress: string
  zone: string
  notes: string | null
  active: boolean
}

export default function ClienteModal({
  cliente,
  onClose,
  onSaved,
}: {
  cliente?: Cliente | null
  onClose: () => void
  onSaved: () => void
}) {
  const [fullName, setFullName] = useState(cliente?.fullName ?? '')
  const [phones, setPhones] = useState<string[]>(cliente?.phones?.length ? cliente.phones : [''])
  const [deliveryAddress, setDeliveryAddress] = useState(cliente?.deliveryAddress ?? '')
  const [zone, setZone] = useState(cliente?.zone ?? '')
  const [notes, setNotes] = useState(cliente?.notes ?? '')
  const [active, setActive] = useState(cliente?.active ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function updatePhone(i: number, value: string) {
    setPhones((prev) => prev.map((p, idx) => (idx === i ? value : p)))
  }

  function addPhone() {
    setPhones((prev) => [...prev, ''])
  }

  function removePhone(i: number) {
    setPhones((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      fullName,
      phones: phones.map((p) => p.trim()).filter(Boolean),
      deliveryAddress,
      zone,
      notes,
      active,
    }

    const url = cliente ? `/api/clientes/${cliente.id}` : '/api/clientes'
    const method = cliente ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error?.formErrors?.[0] ?? 'No se pudo guardar el cliente.')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm mb-1">Nombre completo</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Teléfonos</label>
          {phones.map((phone, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                required={i === 0}
                value={phone}
                onChange={(e) => updatePhone(i, e.target.value)}
                className="flex-1 px-3 py-2 border border-brand-gray rounded"
              />
              {phones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePhone(i)}
                  className="text-brand-gray-dk hover:text-red-600 px-2"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPhone}
            className="text-sm text-brand-blue"
          >
            + Agregar teléfono
          </button>
        </div>

        <div>
          <label className="block text-sm mb-1">Dirección de entrega</label>
          <input
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Zona</label>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Notas</label>
          <textarea
            value={notes ?? ''}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        {cliente && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Cliente activo
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-brand-gray-dk"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-brand-blue text-white rounded font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
