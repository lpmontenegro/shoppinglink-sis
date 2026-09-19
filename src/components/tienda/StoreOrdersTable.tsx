'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import StoreOrderModal from './StoreOrderModal'
import StatusBadge from '@/components/StatusBadge'
import { formatGTQ, formatUSD } from '@/lib/currency'

type Claim = {
  id: string
  clientId: string
  quantity: number
  confirmed: boolean
  client: { id: string; fullName: string }
}

type StoreOrder = {
  id: string
  cycleId: string
  photoUrl: string | null
  productName: string
  store: string
  costUsd: number | null
  exchangeRate: number
  cost: number
  suggestedPrice: number
  finalPrice: number
  storeLocationNote: string | null
  purchased: boolean
  claims: Claim[]
}

type ClienteOption = { id: string; fullName: string }
type CicloOption = { id: string; code: string; status: string; taxRate: number }

function claimedQty(order: StoreOrder) {
  return order.claims.reduce((sum, c) => sum + c.quantity, 0)
}

export default function StoreOrdersTable({
  storeOrders,
  clientes,
  ciclos,
  defaultCycleId,
}: {
  storeOrders: StoreOrder[]
  clientes: ClienteOption[]
  ciclos: CicloOption[]
  defaultCycleId?: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<StoreOrder | null>(null)
  const [creating, setCreating] = useState(false)
  const [cycleFilter, setCycleFilter] = useState(defaultCycleId ?? 'all')
  const [claimClientId, setClaimClientId] = useState<Record<string, string>>({})
  const [claimQty, setClaimQty] = useState<Record<string, string>>({})

  const filtered = useMemo(() => {
    if (cycleFilter === 'all') return storeOrders
    return storeOrders.filter((o) => o.cycleId === cycleFilter)
  }, [storeOrders, cycleFilter])

  function closeAndRefresh() {
    setEditing(null)
    setCreating(false)
    router.refresh()
  }

  async function addClaim(orderId: string) {
    const clientId = claimClientId[orderId]
    if (!clientId) return
    const quantity = parseInt(claimQty[orderId] || '1', 10) || 1
    await fetch(`/api/store-orders/${orderId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, quantity }),
    })
    setClaimClientId((prev) => ({ ...prev, [orderId]: '' }))
    setClaimQty((prev) => ({ ...prev, [orderId]: '' }))
    router.refresh()
  }

  async function toggleClaimConfirmed(orderId: string, claim: Claim) {
    await fetch(`/api/store-orders/${orderId}/claims/${claim.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: !claim.confirmed }),
    })
    router.refresh()
  }

  async function removeClaim(orderId: string, claimId: string) {
    await fetch(`/api/store-orders/${orderId}/claims/${claimId}`, { method: 'DELETE' })
    router.refresh()
  }

  async function togglePurchased(order: StoreOrder) {
    await fetch(`/api/store-orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchased: !order.purchased }),
    })
    router.refresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-brand-black">Compras en tienda</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-brand-blue text-white rounded font-medium text-sm"
        >
          + Nueva compra
        </button>
      </div>

      <p className="text-sm text-brand-gray-dk mb-4">
        Productos encontrados en tienda durante el viaje. Se publican aquí, los clientes reclaman
        cantidades (avisado por WhatsApp), y al confirmar la compra se marca "ya comprado".
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          className="px-3 py-2 border border-brand-gray rounded text-sm"
        >
          <option value="all">Todos los ciclos</option>
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((order) => (
          <div key={order.id} className="bg-white border border-brand-gray rounded-lg overflow-hidden">
            <div className="flex justify-between items-start px-4 py-3 bg-brand-gray-lt">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brand-black">{order.productName}</span>
                  <span className="text-sm text-brand-gray-dk">· {order.store}</span>
                  <StatusBadge
                    label={order.purchased ? 'Comprado' : 'Pendiente de comprar'}
                    colorClass={order.purchased ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}
                  />
                </div>
                <div className="text-sm text-brand-gray-dk mt-1">
                  Costo: {order.costUsd != null ? formatUSD(order.costUsd) : '—'} ≈ {formatGTQ(order.cost)} ·
                  {' '}Sugerido: {formatGTQ(order.suggestedPrice)} · Final: {formatGTQ(order.finalPrice)}
                </div>
                {order.storeLocationNote && (
                  <div className="text-xs text-brand-gray-dk mt-1">{order.storeLocationNote}</div>
                )}
                <div className="text-xs text-brand-gray-dk mt-1">
                  Reclamado: {claimedQty(order)} unidad{claimedQty(order) === 1 ? '' : 'es'}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => togglePurchased(order)} className="text-sm text-brand-blue">
                  {order.purchased ? 'Marcar pendiente' : 'Marcar comprado'}
                </button>
                <button onClick={() => setEditing(order)} className="text-sm text-brand-blue">
                  Editar
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="text-xs font-medium text-brand-gray-dk mb-2">Clientes que reclamaron</p>
              {order.claims.length === 0 && (
                <p className="text-sm text-brand-gray-dk mb-2">Nadie ha reclamado todavía.</p>
              )}
              <ul className="space-y-1 mb-3">
                {order.claims.map((claim) => (
                  <li key={claim.id} className="flex items-center justify-between text-sm">
                    <span>
                      {claim.client.fullName} · {claim.quantity} unidad{claim.quantity === 1 ? '' : 'es'}
                      {' '}· {formatGTQ(order.finalPrice * claim.quantity)}
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        onClick={() => toggleClaimConfirmed(order.id, claim)}
                        className={claim.confirmed ? 'text-green-700' : 'text-brand-gray-dk'}
                      >
                        {claim.confirmed ? 'Confirmado' : 'Confirmar'}
                      </button>
                      <button onClick={() => removeClaim(order.id, claim.id)} className="text-red-600">
                        Quitar
                      </button>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2">
                <select
                  value={claimClientId[order.id] ?? ''}
                  onChange={(e) => setClaimClientId((prev) => ({ ...prev, [order.id]: e.target.value }))}
                  className="px-2 py-1.5 border border-brand-gray rounded text-sm flex-1 min-w-[160px]"
                >
                  <option value="">Agregar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder="Cant."
                  value={claimQty[order.id] ?? ''}
                  onChange={(e) => setClaimQty((prev) => ({ ...prev, [order.id]: e.target.value }))}
                  className="w-20 px-2 py-1.5 border border-brand-gray rounded text-sm"
                />
                <button
                  onClick={() => addClaim(order.id)}
                  className="px-3 py-1.5 bg-brand-blue text-white rounded text-sm"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-brand-gray-dk py-6">No hay compras registradas con este filtro.</p>
        )}
      </div>

      {creating && (
        <StoreOrderModal
          ciclos={ciclos}
          defaultCycleId={defaultCycleId}
          onClose={() => setCreating(false)}
          onSaved={closeAndRefresh}
        />
      )}
      {editing && (
        <StoreOrderModal
          storeOrder={editing}
          ciclos={ciclos}
          onClose={() => setEditing(null)}
          onSaved={closeAndRefresh}
        />
      )}
    </div>
  )
}
