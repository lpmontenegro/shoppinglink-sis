'use client'

import { useEffect, useState } from 'react'

export default function ExchangeRateWidget() {
  const [rate, setRate] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/exchange-rate')
      .then((res) => res.json())
      .then((data) => setRate(data.rate))
      .catch(() => setRate(null))
  }, [])

  async function save() {
    const value = parseFloat(draft)
    if (!Number.isFinite(value) || value <= 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/exchange-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: value }),
      })
      if (res.ok) {
        setRate(value)
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-brand-gray-dk">Q</span>
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          className="w-16 border border-brand-gray rounded px-1 py-0.5"
        />
        <span className="text-brand-gray-dk">/ $</span>
        <button
          onClick={save}
          disabled={saving}
          className="text-brand-blue font-medium disabled:opacity-50"
        >
          Guardar
        </button>
        <button onClick={() => setEditing(false)} className="text-brand-gray-dk">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(rate != null ? String(rate) : '')
        setEditing(true)
      }}
      className="text-sm text-brand-gray-dk hover:text-brand-black"
      title="Tipo de cambio usado para nuevos pedidos"
    >
      Tipo de cambio:{' '}
      <span className="font-medium text-brand-black">
        {rate != null ? `Q${rate.toFixed(2)} / $` : '...'}
      </span>
    </button>
  )
}
