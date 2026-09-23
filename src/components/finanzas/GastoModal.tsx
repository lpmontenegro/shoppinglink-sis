'use client'

import { useState } from 'react'
import Modal from '@/components/Modal'
import MoneyInput from '@/components/MoneyInput'

const EXPENSE_TYPES = ['Boletos aéreos', 'Maletas', 'Cajas/courier', 'Gastos de viaje', 'Otros'] as const

type Expense = {
  id: string
  type: string
  date: string
  amount: number
  description: string | null
}

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

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export default function GastoModal({
  cycleId,
  expense,
  onClose,
  onSaved,
}: {
  cycleId: string
  expense?: Expense | null
  onClose: () => void
  onSaved: () => void
}) {
  const [type, setType] = useState<string>(expense?.type ?? EXPENSE_TYPES[0])
  const [date, setDate] = useState(expense ? expense.date.slice(0, 10) : todayInput())
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      cycleId,
      type,
      date,
      amount: parseFloat(amount) || 0,
      description: description || null,
    }

    const url = expense ? `/api/gastos/${expense.id}` : '/api/gastos'
    const method = expense ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(extractErrorMessage(data, 'No se pudo guardar el gasto.'))
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={expense ? 'Editar gasto' : 'Nuevo gasto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          >
            {EXPENSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Fecha</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-xs text-brand-gray-dk mb-1">Monto (Q)</label>
          <MoneyInput required prefix="Q" value={amount} onChange={setAmount} />
        </div>

        <div>
          <label className="block text-sm mb-1">Descripción (opcional)</label>
          <textarea
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
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
