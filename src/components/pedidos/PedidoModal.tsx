'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/Modal'
import MoneyInput from '@/components/MoneyInput'
import PhotoInput from '@/components/PhotoInput'
import { formatGTQ, usdToGtq } from '@/lib/currency'
import { costWithTax, DEFAULT_TAX_RATE, suggestedSalePriceUsd } from '@/lib/pricing'

type ClienteOption = { id: string; fullName: string }
type CicloOption = { id: string; code: string; status: string; taxRate: number }

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

type PedidoItem = {
  id: string
  productName: string | null
  photoUrl: string | null
  productLink: string | null
  purchaseType: 'ADVANCE' | 'COURIER'
  costUsd: string | number | null
  cost: string | number
  salePrice: string | number
  notes: string | null
}

type Pedido = {
  id: string
  clientId: string
  cycleId: string
  notes: string | null
  items: PedidoItem[]
}

type ItemState = {
  id?: string
  purchaseType: 'ADVANCE' | 'COURIER'
  productName: string
  photoUrl: string
  productLink: string
  costUsd: string
  cost: string
  salePrice: string
  notes: string
}

function emptyItem(): ItemState {
  return {
    purchaseType: 'ADVANCE',
    productName: '',
    photoUrl: '',
    productLink: '',
    costUsd: '',
    cost: '',
    salePrice: '',
    notes: '',
  }
}

function itemsFromPedido(pedido?: Pedido | null): ItemState[] {
  if (!pedido?.items?.length) return [emptyItem()]
  return pedido.items.map((i) => ({
    id: i.id,
    purchaseType: i.purchaseType,
    productName: i.productName ?? '',
    photoUrl: i.photoUrl ?? '',
    productLink: i.productLink ?? '',
    costUsd: i.costUsd != null ? String(i.costUsd) : '',
    cost: String(i.cost),
    salePrice: String(i.salePrice),
    notes: i.notes ?? '',
  }))
}

function OrderItemFields({
  item,
  index,
  rate,
  taxRate,
  onChange,
  onRemove,
}: {
  item: ItemState
  index: number
  rate: number | null
  taxRate: number
  onChange: (patch: Partial<ItemState>) => void
  onRemove?: () => void
}) {
  const computedCost = useMemo(() => {
    const usd = parseFloat(item.costUsd)
    if (!rate || !Number.isFinite(usd)) return null
    return usdToGtq(usd, rate)
  }, [item.costUsd, rate])

  // Costo + impuesto de compra — la base real sobre la que se calcula la
  // ganancia (el impuesto solo aplica a compras anticipadas: en courier el
  // cliente ya compró, Shopping Link solo cobra un fee de traída).
  const costBasisQ = useMemo(() => {
    if (item.purchaseType === 'ADVANCE') {
      if (computedCost == null) return null
      return costWithTax(computedCost, taxRate)
    }
    const n = parseFloat(item.cost)
    return Number.isFinite(n) ? n : null
  }, [item.purchaseType, computedCost, item.cost, taxRate])

  const suggestedPrice = useMemo(() => {
    const usd = parseFloat(item.costUsd)
    if (!rate || !Number.isFinite(usd) || usd <= 0) return null
    return usdToGtq(suggestedSalePriceUsd(usd, taxRate), rate)
  }, [item.costUsd, rate, taxRate])

  const profit = useMemo(() => {
    const price = parseFloat(item.salePrice)
    if (!Number.isFinite(price) || costBasisQ == null) return null
    return price - costBasisQ
  }, [item.salePrice, costBasisQ])

  return (
    <div className="relative border border-brand-gray rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-brand-gray-dk">Producto {index + 1}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-brand-gray-dk hover:text-red-600 text-lg leading-none px-1"
            aria-label="Quitar producto"
          >
            &times;
          </button>
        )}
      </div>

      <div className="mb-2">
        <input
          placeholder="Nombre corto del producto (ej. Zapatos Nike 8.5)"
          value={item.productName}
          onChange={(e) => onChange({ productName: e.target.value })}
          className="w-full px-3 py-2 border border-brand-gray rounded text-sm mb-2"
        />
        <PhotoInput
          value={item.photoUrl || null}
          onChange={(url) => onChange({ photoUrl: url ?? '' })}
          label="Foto del producto"
        />
      </div>

      <div className="flex gap-4 text-sm mb-2">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={item.purchaseType === 'ADVANCE'}
            onChange={() => onChange({ purchaseType: 'ADVANCE' })}
          />
          Compra anticipada
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={item.purchaseType === 'COURIER'}
            onChange={() => onChange({ purchaseType: 'COURIER' })}
          />
          Courier
        </label>
      </div>

      {item.purchaseType === 'ADVANCE' ? (
        <div className="space-y-2">
          <input
            placeholder="Link del producto"
            value={item.productLink}
            onChange={(e) => onChange({ productLink: e.target.value })}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
          <div>
            <label className="block text-xs text-brand-gray-dk mb-1">Costo (USD)</label>
            <MoneyInput required prefix="$" value={item.costUsd} onChange={(v) => onChange({ costUsd: v })} />
            <p className="mt-1 text-xs text-brand-gray-dk">
              {computedCost != null
                ? `≈ ${formatGTQ(computedCost)} al tipo de cambio actual · ${formatGTQ(costWithTax(computedCost, taxRate))} con impuesto (${taxRate}%)`
                : rate == null
                  ? 'Cargando tipo de cambio...'
                  : ''}
            </p>
            {suggestedPrice != null && (
              <p className="mt-1 text-xs text-brand-gray-dk">
                Precio sugerido: {formatGTQ(suggestedPrice)}{' '}
                <button
                  type="button"
                  onClick={() => onChange({ salePrice: suggestedPrice.toFixed(2) })}
                  className="text-brand-blue underline"
                >
                  usar
                </button>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-xs text-brand-gray-dk mb-1">
            Costo (Q) — si Shopping Link cobra algo por traerlo
          </label>
          <MoneyInput prefix="Q" value={item.cost} onChange={(v) => onChange({ cost: v })} />
        </div>
      )}

      <div className="mt-2">
        <label className="block text-xs text-brand-gray-dk mb-1">Precio de venta al cliente (Q)</label>
        <MoneyInput required prefix="Q" value={item.salePrice} onChange={(v) => onChange({ salePrice: v })} />
        {profit != null && (
          <p className={`mt-1 text-xs ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            Ganancia: {formatGTQ(profit)}
          </p>
        )}
      </div>

      <div className="mt-2">
        <input
          placeholder="Notas de este producto (opcional)"
          value={item.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="w-full px-3 py-2 border border-brand-gray rounded text-sm"
        />
      </div>
    </div>
  )
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
  const [notes, setNotes] = useState(pedido?.notes ?? '')
  const [items, setItems] = useState<ItemState[]>(itemsFromPedido(pedido))
  const [rate, setRate] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings/exchange-rate')
      .then((res) => res.json())
      .then((data) => setRate(data.rate))
      .catch(() => setRate(null))
  }, [])

  const selectedCycleTaxRate = useMemo(() => {
    return ciclos.find((c) => c.id === cycleId)?.taxRate ?? DEFAULT_TAX_RATE
  }, [ciclos, cycleId])

  function updateItem(i: number, patch: Partial<ItemState>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload: Record<string, unknown> = {
      cycleId,
      notes,
      items: items.map((it) => ({
        id: it.id,
        purchaseType: it.purchaseType,
        productName: it.productName || null,
        photoUrl: it.photoUrl || null,
        productLink: it.purchaseType === 'ADVANCE' ? it.productLink : null,
        costUsd: it.purchaseType === 'ADVANCE' ? parseFloat(it.costUsd) : null,
        cost: it.purchaseType === 'ADVANCE' ? 0 : parseFloat(it.cost) || 0,
        salePrice: parseFloat(it.salePrice) || 0,
        notes: it.notes || null,
      })),
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Productos</label>
            <button type="button" onClick={addItem} className="text-xs text-brand-blue">
              + Agregar producto
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <OrderItemFields
                key={item.id ?? `new-${i}`}
                item={item}
                index={i}
                rate={rate}
                taxRate={selectedCycleTaxRate}
                onChange={(patch) => updateItem(i, patch)}
                onRemove={items.length > 1 ? () => removeItem(i) : undefined}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Notas del pedido</label>
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
