'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import PickupPlaceSelect from './PickupPlaceSelect'
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, joinPhone, splitPhone } from '@/lib/phone'

type Cliente = {
  id: string
  fullName: string
  phones: string[]
  deliveryAddress: string
  zone: string
  fulfillmentMethod: string
  pickupPlaceId: string | null
  notes: string | null
  active: boolean
}

type PhoneEntry = { code: string; number: string }

function initialPhones(phones?: string[]): PhoneEntry[] {
  if (!phones?.length) return [{ code: DEFAULT_COUNTRY_CODE, number: '' }]
  return phones.map(splitPhone)
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
  const [phones, setPhones] = useState<PhoneEntry[]>(initialPhones(cliente?.phones))
  const [deliveryAddress, setDeliveryAddress] = useState(cliente?.deliveryAddress ?? '')
  const [zone, setZone] = useState(cliente?.zone ?? '')
  const [fulfillmentMethod, setFulfillmentMethod] = useState(cliente?.fulfillmentMethod ?? 'DELIVERY')
  const [pickupPlaceId, setPickupPlaceId] = useState(cliente?.pickupPlaceId ?? '')
  const [notes, setNotes] = useState(cliente?.notes ?? '')
  const [active, setActive] = useState(cliente?.active ?? true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function updatePhone(i: number, field: 'code' | 'number', value: string) {
    setPhones((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  function addPhone() {
    setPhones((prev) => [...prev, { code: DEFAULT_COUNTRY_CODE, number: '' }])
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
      phones: phones.map((p) => joinPhone(p.code, p.number)).filter(Boolean),
      deliveryAddress,
      zone,
      fulfillmentMethod,
      pickupPlaceId: fulfillmentMethod === 'PICKUP' ? pickupPlaceId || null : null,
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
              <select
                value={phone.code}
                onChange={(e) => updatePhone(i, 'code', e.target.value)}
                className="px-2 py-2 border border-brand-gray rounded text-sm w-28 shrink-0"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
              <input
                required={i === 0}
                placeholder="0000-0000"
                value={phone.number}
                onChange={(e) => updatePhone(i, 'number', e.target.value)}
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
          <label className="block text-sm mb-1">Forma de entrega</label>
          <div className="flex gap-4 text-sm mb-2">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={fulfillmentMethod === 'DELIVERY'}
                onChange={() => setFulfillmentMethod('DELIVERY')}
              />
              Delivery (por zona)
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={fulfillmentMethod === 'PICKUP'}
                onChange={() => setFulfillmentMethod('PICKUP')}
              />
              Pickup (punto fijo)
            </label>
          </div>

          {fulfillmentMethod === 'PICKUP' ? (
            <PickupPlaceSelect value={pickupPlaceId} onChange={setPickupPlaceId} />
          ) : (
            <div className="space-y-2">
              <input
                placeholder="Dirección de entrega"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray rounded"
              />
              <input
                placeholder="Zona"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray rounded"
              />
            </div>
          )}
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
