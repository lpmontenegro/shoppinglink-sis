'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'

function extractErrorMessage(data: any, fallback: string): string {
  if (!data?.error) return fallback
  if (typeof data.error === 'string') return data.error
  if (data.error.formErrors?.[0]) return data.error.formErrors[0]
  const fieldErrors = data.error.fieldErrors as Record<string, string[]> | undefined
  if (fieldErrors) {
    for (const key in fieldErrors) {
      if (fieldErrors[key]?.[0]) return fieldErrors[key][0]
    }
  }
  return fallback
}

type StoreVisit = {
  id: string
  cycleId: string
  store: string
  visitDate: string | Date
  notes: string | null
}

type CicloOption = { id: string; code: string; status: string }

function toDateInput(d: string | Date | null | undefined) {
  if (!d) return new Date().toISOString().slice(0, 10)
  return new Date(d).toISOString().slice(0, 10)
}

export default function StoreVisitModal({
  visit,
  ciclos,
  defaultCycleId,
  onClose,
  onSaved,
}: {
  visit?: StoreVisit | null
  ciclos: CicloOption[]
  defaultCycleId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [cycleId, setCycleId] = useState(visit?.cycleId ?? defaultCycleId ?? '')
  const [store, setStore] = useState(visit?.store ?? '')
  const [visitDate, setVisitDate] = useState(toDateInput(visit?.visitDate))
  const [notes, setNotes] = useState(visit?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      cycleId,
      store,
      visitDate: new Date(visitDate).toISOString(),
      notes: notes || null,
    }

    const url = visit ? `/api/store-visits/${visit.id}` : '/api/store-visits'
    const method = visit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(extractErrorMessage(data, 'No se pudo guardar la visita.'))
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={visit ? 'Editar visita a tienda' : 'Nueva visita a tienda'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm mb-1">Ciclo</label>
          <select
            required
            disabled={!!visit}
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded disabled:bg-brand-gray-lt"
          >
            <option value="">Seleccionar ciclo...</option>
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Tienda</label>
          <input
            required
            placeholder="ej. Target, Walmart, Ross..."
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Fecha de visita</label>
          <input
            type="date"
            required
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Notas (opcional)</label>
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
