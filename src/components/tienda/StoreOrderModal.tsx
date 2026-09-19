'use client'

import { useMemo, useState } from 'react'
import Modal from '@/components/Modal'
import MoneyInput from '@/components/MoneyInput'
import { formatGTQ, usdToGtq } from '@/lib/currency'
import { suggestedSalePriceUsd, DEFAULT_TAX_RATE } from '@/lib/pricing'

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

type StoreOrder = {
  id: string
  cycleId: string
  photoUrl: string | null
  productName: string
  store: string
  costUsd: number | null
  exchangeRate: number
  finalPrice: number
  storeLocationNote: string | null
  purchased: boolean
}

type CicloOption = { id: string; code: string; status: string; taxRate: number }

export default function StoreOrderModal({
  storeOrder,
  ciclos,
  defaultCycleId,
  onClose,
  onSaved,
}: {
  storeOrder?: StoreOrder | null
  ciclos: CicloOption[]
  defaultCycleId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const [cycleId, setCycleId] = useState(storeOrder?.cycleId ?? defaultCycleId ?? '')
  const [productName, setProductName] = useState(storeOrder?.productName ?? '')
  const [store, setStore] = useState(storeOrder?.store ?? '')
  const [photoUrl, setPhotoUrl] = useState(storeOrder?.photoUrl ?? '')
  const [costUsd, setCostUsd] = useState(storeOrder ? String(storeOrder.costUsd ?? '') : '')
  const [finalPrice, setFinalPrice] = useState(storeOrder ? String(storeOrder.finalPrice) : '')
  const [storeLocationNote, setStoreLocationNote] = useState(storeOrder?.storeLocationNote ?? '')
  const [purchased, setPurchased] = useState(storeOrder?.purchased ?? false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const taxRate = useMemo(() => {
    return ciclos.find((c) => c.id === cycleId)?.taxRate ?? DEFAULT_TAX_RATE
  }, [ciclos, cycleId])

  // Sugerencia informativa en el navegador — el servidor recalcula igual al
  // guardar, con el tipo de cambio real. Aquí solo usamos la tasa del pedido
  // existente (o un estimado) para mostrar algo útil mientras se escribe.
  const rateHint = storeOrder?.exchangeRate ?? null
  const suggestedPrice = useMemo(() => {
    const usd = parseFloat(costUsd)
    if (!rateHint || !Number.isFinite(usd) || usd <= 0) return null
    return usdToGtq(suggestedSalePriceUsd(usd, taxRate), rateHint)
  }, [costUsd, rateHint, taxRate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      cycleId,
      productName,
      store,
      photoUrl: photoUrl || null,
      costUsd: parseFloat(costUsd) || 0,
      finalPrice: parseFloat(finalPrice) || 0,
      storeLocationNote: storeLocationNote || null,
      purchased,
    }

    const url = storeOrder ? `/api/store-orders/${storeOrder.id}` : '/api/store-orders'
    const method = storeOrder ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(extractErrorMessage(data, 'No se pudo guardar la compra.'))
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={storeOrder ? 'Editar compra en tienda' : 'Nueva compra en tienda'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <label className="block text-sm mb-1">Ciclo</label>
          <select
            required
            disabled={!!storeOrder}
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
          <label className="block text-sm mb-1">Producto</label>
          <input
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Tienda</label>
          <input
            required
            placeholder="ej. Target, Walmart, Amazon..."
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Foto (link, opcional)</label>
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        <div>
          <label className="block text-xs text-brand-gray-dk mb-1">Costo (USD)</label>
          <MoneyInput required prefix="$" value={costUsd} onChange={setCostUsd} />
          {suggestedPrice != null && (
            <p className="mt-1 text-xs text-brand-gray-dk">
              Precio sugerido: {formatGTQ(suggestedPrice)}{' '}
              <button
                type="button"
                onClick={() => setFinalPrice(suggestedPrice.toFixed(2))}
                className="text-brand-blue underline"
              >
                usar
              </button>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-brand-gray-dk mb-1">Precio final a cobrar (Q)</label>
          <MoneyInput required prefix="Q" value={finalPrice} onChange={setFinalPrice} />
        </div>

        <div>
          <label className="block text-sm mb-1">Notas de ubicación en tienda (opcional)</label>
          <textarea
            value={storeLocationNote ?? ''}
            onChange={(e) => setStoreLocationNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-brand-gray rounded"
          />
        </div>

        {storeOrder && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={purchased} onChange={(e) => setPurchased(e.target.checked)} />
            Ya comprado
          </label>
        )}

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
