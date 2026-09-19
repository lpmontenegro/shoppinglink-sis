'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import { CYCLE_STATUS_LABELS } from '@/lib/cycleStatus'

type Ciclo = {
  id: string
  code: string
  status: string
  openDate: string | Date
  closeDate: string | Date | null
  travelDepartDate: string | Date | null
  travelReturnDate: string | Date | null
  boxArrivalDate: string | Date | null
  cycleDeliveryAddress: string | null
  notes: string | null
}

function toDateInput(value: string | Date | null | undefined) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export default function CicloModal({
  ciclo,
  onClose,
  onSaved,
}: {
  ciclo?: Ciclo | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(ciclo?.code ?? '')
  const [status, setStatus] = useState(ciclo?.status ?? 'OPEN')
  const [openDate, setOpenDate] = useState(toDateInput(ciclo?.openDate))
  const [closeDate, setCloseDate] = useState(toDateInput(ciclo?.closeDate))
  const [travelDepartDate, setTravelDepartDate] = useState(toDateInput(ciclo?.travelDepartDate))
  const [travelReturnDate, setTravelReturnDate] = useState(toDateInput(ciclo?.travelReturnDate))
  const [boxArrivalDate, setBoxArrivalDate] = useState(toDateInput(ciclo?.boxArrivalDate))
  const [cycleDeliveryAddress, setCycleDeliveryAddress] = useState(ciclo?.cycleDeliveryAddress ?? '')
  const [notes, setNotes] = useState(ciclo?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      code,
      status,
      openDate: openDate || null,
      closeDate: closeDate || null,
      travelDepartDate: travelDepartDate || null,
      travelReturnDate: travelReturnDate || null,
      boxArrivalDate: boxArrivalDate || null,
      cycleDeliveryAddress,
      notes,
    }

    const url = ciclo ? `/api/ciclos/${ciclo.id}` : '/api/ciclos'
    const method = ciclo ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(
          typeof data?.error === 'string'
            ? data.error
            : data?.error?.formErrors?.[0] ?? 'No se pudo guardar el ciclo.'
        )
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={ciclo ? 'Editar ciclo' : 'Nuevo ciclo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm mb-1">Código</label>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ej. 2026-10"
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        {ciclo && (
          <div>
            <label className="block text-sm mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray rounded"
            >
              {Object.entries(CYCLE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Fecha de apertura</label>
            <input
              required
              type="date"
              value={openDate}
              onChange={(e) => setOpenDate(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha de cierre</label>
            <input
              type="date"
              value={closeDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Salida del viaje</label>
            <input
              type="date"
              value={travelDepartDate}
              onChange={(e) => setTravelDepartDate(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray rounded"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Regreso del viaje</label>
            <input
              type="date"
              value={travelReturnDate}
              onChange={(e) => setTravelReturnDate(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray rounded"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm mb-1">Llegada de maleta/caja</label>
            <input
              type="date"
              value={boxArrivalDate}
              onChange={(e) => setBoxArrivalDate(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Dirección de entrega del ciclo</label>
          <input
            value={cycleDeliveryAddress ?? ''}
            onChange={(e) => setCycleDeliveryAddress(e.target.value)}
            placeholder="Dónde se reciben los paquetes online/courier este ciclo"
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

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-brand-gray-dk">
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
