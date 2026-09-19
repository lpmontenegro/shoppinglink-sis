'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/Modal'
import { formatGTQ, usdToGtq } from '@/lib/currency'
import { suggestedSalePriceUsd } from '@/lib/pricing'

type ClienteOption = { id: string; fullName: string }
type CicloOption = { id: string; code: string; status: string }

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

type Pedido = {
  id: string
  clientId: string
  cycleId: string
  purchaseType: 'ADVANCE' | 'COURIER'
  productLink: string | null
  costUsd: string | number | null
  cost: string | number
  salePrice: string | number
  notes: string | null
}

export default function PedidoModal({
  pedido,
  clientes,
  ciclos,
  defaultCycleId,
  onClose,
  onSaved,
}: {
  pedido?: Pedido | null
  clientes: ClienteOption[]
  ciclos: CicloOption[]
  defaultCycleId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [newClientMode, setNewClientMode] = useState(false)
  const [clientId, setClientId] = useState(pedido?.clientId ?? '')
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')

  const [cycleId, setCycleId] = useState(pedido?.cycleId ?? defaultCycleId ?? '')
  const [purchaseType, setPurchaseType] = useState<'ADVANCE' | 'COURIER'>(
    pedido?.purchaseType ?? 'ADVANCE'
  )
  const [productLink, setProductLink] = useState(pedido?.productLink ?? '')
  const [costUsd, setCostUsd] = useState(pedido?.costUsd != null ? String(pedido.costUsd) : '')
  const [cost, setCost] = useState(pedido ? String(pedido.cost) : '')
  const [salePrice, setSalePrice] = useState(pedido ? String(pedido.salePrice) : '')
  const [notes, setNotes] = useState(pedido?.notes ?? '')
  const [rate, setRate] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/exchange-rate')
      .then((res) => res.json())
      .then((data) => setRate(data.rate))
      .catch(() => setRate(null))
  }, [])

  const computedCost = useMemo(() => {
    const usd = parseFloat(costUsd)
    if (!rate || !Number.isFinite(usd)) return null
    return usdToGtq(usd, rate)
  }, [costUsd, rate])

  const suggestedPrice = useMemo(() => {
    const usd = parseFloat(costUsd)
    if (!rate || !Number.isFinite(usd) || usd <= 0) return null
    return usdToGtq(suggestedSalePriceUsd(usd), rate)
  }, [costUsd, rate])

  const currentCostQ = useMemo(() => {
    if (purchaseType === 'ADVANCE') return computedCost
    const n = parseFloat(cost)
    return Number.isFinite(n) ? n : null
  }, [purchaseType, computedCost, cost])

  const profit = useMemo(() => {
    const price = parseFloat(salePrice)
    if (!Number.isFinite(price) || currentCostQ == null) return null
    return price - currentCostQ
  }, [salePrice, currentCostQ])

  function formatOnBlur(value: string, setValue: (v: string) => void) {
    const n = parseFloat(value)
    if (Number.isFinite(n)) setValue(n.toFixed(2))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload: Record<string, unknown> = {
      cycleId,
      purchaseType,
      productLink: purchaseType === 'ADVANCE' ? productLink : null,
      costUsd: purchaseType === 'ADVANCE' ? parseFloat(costUsd) : null,
      cost: purchaseType === 'ADVANCE' ? computedCost ?? 0 : parseFloat(cost) || 0,
      salePrice: parseFloat(salePrice) || 0,
      notes,
    }

    if (newClientMode) {
      payload.newClient = { fullName: newClientName, phone: newClientPhone }
    } else {
      payload.clientId = clientId
    }

    const url = pedido ? `/api/pedidos/${pedido.id}` : '/api/pedidos'
    const method = pedido ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(extractErrorMessage(data, 'No se pudo guardar el pedido.'))
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={pedido ? 'Editar pedido' : 'Nuevo pedido'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!pedido && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm">Cliente</label>
              <button
                type="button"
                onClick={() => setNewClientMode((v) => !v)}
                className="text-xs text-brand-blue"
              >
                {newClientMode ? 'Usar cliente existente' : '+ Cliente nuevo'}
              </button>
            </div>

            {newClientMode ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Nombre"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="px-3 py-2 border border-brand-gray rounded"
                />
                <input
                  required
                  placeholder="Teléfono"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="px-3 py-2 border border-brand-gray rounded"
                />
              </div>
            ) : (
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray rounded"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Ciclo</label>
          <select
            required
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
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
          <label className="block text-sm mb-1">Tipo de compra</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={purchaseType === 'ADVANCE'}
                onChange={() => setPurchaseType('ADVANCE')}
              />
              Compra anticipada
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={purchaseType === 'COURIER'}
                onChange={() => setPurchaseType('COURIER')}
              />
              Courier (cliente ya compró)
            </label>
          </div>
        </div>

        {purchaseType === 'ADVANCE' ? (
          <>
            <div>
              <label className="block text-sm mb-1">Link del producto</label>
              <input
                value={productLink ?? ''}
                onChange={(e) => setProductLink(e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray rounded"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Costo (USD)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={costUsd}
                onChange={(e) => setCostUsd(e.target.value)}
                onBlur={(e) => formatOnBlur(e.target.value, setCostUsd)}
                className="w-full px-3 py-2 border border-brand-gray rounded"
              />
              <p className="mt-1 text-xs text-brand-gray-dk">
                {computedCost != null
                  ? `≈ ${formatGTQ(computedCost)} al tipo de cambio actual`
                  : rate == null
                    ? 'Cargando tipo de cambio...'
                    : ''}
              </p>
              {suggestedPrice != null && (
                <p className="mt-1 text-xs text-brand-gray-dk">
                  Precio sugerido: {formatGTQ(suggestedPrice)}{' '}
                  <button
                    type="button"
                    onClick={() => setSalePrice(suggestedPrice.toFixed(2))}
                    className="text-brand-blue underline"
                  >
                    usar
                  </button>
                </p>
              )}
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm mb-1">Costo (Q) — si Shopping Link cobra algo por traerlo</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onBlur={(e) => formatOnBlur(e.target.value, setCost)}
              className="w-full px-3 py-2 border border-brand-gray rounded"
            />
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Precio de venta al cliente (Q)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            onBlur={(e) => formatOnBlur(e.target.value, setSalePrice)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
          {profit != null && (
            <p className={`mt-1 text-xs ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              Ganancia: {formatGTQ(profit)}
            </p>
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
