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

type OfferItem = {
  id: string
  photoUrl: string | null
  productName: string
  costUsd: number
  exchangeRate: number
  finalPrice: number
  notes: string | null
}

export default function OfferItemModal({
  visitId,
  offer,
  taxRate,
  onClose,
  onSaved,
}: {
  visitId: string
  offer?: OfferItem | null
  taxRate: number
  onClose: () => void
  onSaved: () => void
}) {
  const [photoUrl, setPhotoUrl] = useState(offer?.photoUrl ?? '')
  const [productName, setProductName] = useState(offer?.productName ?? '')
  const [costUsd, setCostUsd] = useState(offer ? String(offer.costUsd) : '')
  const [finalPrice, setFinalPrice] = useState(offer ? String(offer.finalPrice) : '')
  const [finalPriceTouched, setFinalPriceTouched] = useState(!!offer)
  const [notes, setNotes] = useState(offer?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Al crear: la tasa aún no existe en el registro, así que usamos la del
  // registro si se está editando, o simplemente mostramos la sugerencia sin
  // convertir (el servidor recalcula con la tasa real al guardar).
  const rateHint = offer?.exchangeRate ?? null
  const suggestedPrice = useMemo(() => {
    const usd = parseFloat(costUsd)
    if (!rateHint || !Number.isFinite(usd) || usd <= 0) return null
    return usdToGtq(suggestedSalePriceUsd(usd, taxRate), rateHint)
  }, [costUsd, rateHint, taxRate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload: Record<string, unknown> = {
      photoUrl: photoUrl || null,
      productName,
      costUsd: parseFloat(costUsd) || 0,
      notes: notes || null,
    }
    if (finalPriceTouched && finalPrice !== '') {
      payload.finalPrice = parseFloat(finalPrice) || 0
    }

    const url = offer
      ? `/api/store-visits/${visitId}/offers/${offer.id}`
      : `/api/store-visits/${visitId}/offers`
    const method = offer ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(extractErrorMessage(data, 'No se pudo guardar el producto.'))
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={offer ? 'Editar producto ofrecido' : 'Nuevo producto ofrecido'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}

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
                onClick={() => {
                  setFinalPrice(suggestedPrice.toFixed(2))
                  setFinalPriceTouched(true)
                }}
                className="text-brand-blue underline"
              >
                usar
              </button>
            </p>
          )}
          {rateHint == null && (
            <p className="mt-1 text-xs text-brand-gray-dk">
              El precio sugerido y el costo en Q se calculan al guardar, con el tipo de cambio vigente.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-brand-gray-dk mb-1">
            Precio a ofrecer a clientes (Q) {!offer && '— si se deja vacío, se usa el sugerido'}
          </label>
          <MoneyInput
            value={finalPrice}
            onChange={(v) => {
              setFinalPrice(v)
              setFinalPriceTouched(true)
            }}
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
