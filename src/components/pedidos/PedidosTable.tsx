'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PedidoModal from './PedidoModal'
import StatusBadge from '@/components/StatusBadge'
import PhotoThumb from '@/components/PhotoThumb'
import { formatGTQ, formatUSD } from '@/lib/currency'

type OrderItem = {
  id: string
  productName: string | null
  photoUrl: string | null
  productLink: string | null
  purchaseType: 'ADVANCE' | 'COURIER'
  quantity: number
  costUsd: string | number | null
  cost: string | number
  salePrice: string | number
  confirmed: boolean
  packed: boolean
  packedIn: string | null
  delivered: boolean
  canceled: boolean
  canceledReason: string | null
  notes: string | null
}

type Pedido = {
  id: string
  clientId: string
  cycleId: string
  notes: string | null
  client: { id: string; fullName: string }
  cycle: { id: string; code: string; status: string }
  items: OrderItem[]
}

type ClienteOption = { id: string; fullName: string }
type CicloOption = { id: string; code: string; status: string; taxRate: number }

function itemStatus(item: OrderItem): { label: string; color: string } {
  if (item.canceled) return { label: 'Cancelado', color: 'text-red-700 bg-red-50' }
  if (item.delivered) return { label: 'Entregado', color: 'text-green-700 bg-green-50' }
  if (item.packed) return { label: 'Empacado', color: 'text-purple-700 bg-purple-50' }
  if (item.confirmed) return { label: 'Confirmado', color: 'text-blue-700 bg-blue-50' }
  return { label: 'Pendiente', color: 'text-brand-gray-dk bg-brand-gray-lt' }
}

function orderIsPending(pedido: Pedido) {
  return pedido.items.some((i) => !i.delivered && !i.canceled)
}
function orderIsDelivered(pedido: Pedido) {
  return pedido.items.length > 0 && pedido.items.every((i) => i.delivered)
}
function orderIsCanceled(pedido: Pedido) {
  return pedido.items.length > 0 && pedido.items.every((i) => i.canceled)
}

export default function PedidosTable({
  pedidos,
  clientes,
  ciclos,
  defaultCycleId,
}: {
  pedidos: Pedido[]
  clientes: ClienteOption[]
  ciclos: CicloOption[]
  defaultCycleId?: string
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Pedido | null>(null)
  const [creating, setCreating] = useState(false)
  const [cycleFilter, setCycleFilter] = useState(defaultCycleId ?? 'all')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [clientFilter, setClientFilter] = useState('')

  const filtered = useMemo(() => {
    return pedidos.filter((p) => {
      if (cycleFilter !== 'all' && p.cycleId !== cycleFilter) return false
      if (clientFilter && !p.client.fullName.toLowerCase().includes(clientFilter.toLowerCase()))
        return false
      if (statusFilter === 'pending' && !orderIsPending(p)) return false
      if (statusFilter === 'delivered' && !orderIsDelivered(p)) return false
      if (statusFilter === 'canceled' && !orderIsCanceled(p)) return false
      return true
    })
  }, [pedidos, cycleFilter, statusFilter, clientFilter])

  function closeAndRefresh() {
    setEditing(null)
    setCreating(false)
    router.refresh()
  }

  async function patchItemStatus(orderId: string, itemId: string, data: Record<string, unknown>) {
    await fetch(`/api/pedidos/${orderId}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    router.refresh()
  }

  function cancelarItem(orderId: string, itemId: string) {
    const reason = window.prompt('Motivo de cancelación:')
    if (reason === null) return
    patchItemStatus(orderId, itemId, { canceled: true, canceledReason: reason })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-brand-black">Pedidos</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-brand-blue text-white rounded font-medium text-sm"
        >
          + Nuevo pedido
        </button>
      </div>

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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-brand-gray rounded text-sm"
        >
          <option value="pending">Pendientes</option>
          <option value="delivered">Entregados</option>
          <option value="canceled">Cancelados</option>
          <option value="all">Todos</option>
        </select>
        <input
          placeholder="Buscar cliente..."
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 border border-brand-gray rounded text-sm flex-1 min-w-[160px]"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-white border border-brand-gray rounded-lg overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-brand-gray-lt">
              <div>
                <span className="font-medium text-brand-black">{p.client.fullName}</span>
                <span className="text-brand-gray-dk text-sm">
                  {' '}
                  · {p.cycle.code} · {p.items.length} producto{p.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <button onClick={() => setEditing(p)} className="text-brand-blue text-sm">
                Editar pedido
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-brand-gray-dk">
                  <tr>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Costo</th>
                    <th className="px-4 py-2">Venta</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((item) => {
                    const status = itemStatus(item)
                    return (
                      <tr key={item.id} className="border-t border-brand-gray align-top">
                        <td className="px-4 py-2 max-w-[220px]">
                          <div className="flex items-center gap-2">
                            {item.photoUrl && <PhotoThumb src={item.photoUrl} size="w-8 h-8" />}
                            <div className="truncate">
                              <div className="truncate font-medium text-brand-black">
                                {item.productName || item.productLink || item.notes || '—'}
                                {item.quantity > 1 && (
                                  <span className="ml-1 text-xs font-normal text-brand-blue">×{item.quantity}</span>
                                )}
                              </div>
                              {item.productName && (item.productLink || item.notes) && (
                                <div className="truncate text-xs text-brand-gray-dk">
                                  {item.productLink || item.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {item.purchaseType === 'ADVANCE' ? 'Anticipada' : 'Courier'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatGTQ(item.cost)}
                          {item.costUsd != null && (
                            <span className="block text-xs text-brand-gray-dk">
                              {formatUSD(item.costUsd)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatGTQ(item.salePrice)}
                          {item.quantity > 1 && (
                            <span className="block text-xs text-brand-gray-dk">
                              Total ×{item.quantity}: {formatGTQ(Number(item.salePrice) * item.quantity)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge label={status.label} colorClass={status.color} />
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                          {item.canceled ? (
                            <button
                              onClick={() => patchItemStatus(p.id, item.id, { canceled: false })}
                              className="text-brand-gray-dk"
                            >
                              Reactivar
                            </button>
                          ) : (
                            <>
                              {!item.confirmed && !item.packed && (
                                <button
                                  onClick={() => patchItemStatus(p.id, item.id, { confirmed: true })}
                                  className="text-brand-gray-dk"
                                >
                                  Confirmar
                                </button>
                              )}
                              {item.confirmed && !item.packed && !item.delivered && (
                                <button
                                  onClick={() => patchItemStatus(p.id, item.id, { confirmed: false })}
                                  className="text-brand-gray-dk"
                                >
                                  Deshacer confirmación
                                </button>
                              )}
                              {!item.packed && !item.delivered && (
                                <button
                                  onClick={() => cancelarItem(p.id, item.id)}
                                  className="text-red-600"
                                >
                                  Cancelar
                                </button>
                              )}
                              {(item.packed || item.delivered) && (
                                <span className="text-xs text-brand-gray-dk">
                                  Gestionar en {item.delivered ? 'Distribución' : 'Empaque'}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-brand-gray-dk py-6">No hay pedidos con estos filtros.</p>
        )}
      </div>

      {creating && (
        <PedidoModal
          clientes={clientes}
          ciclos={ciclos}
          defaultCycleId={defaultCycleId}
          onClose={() => setCreating(false)}
          onSaved={closeAndRefresh}
        />
      )}
      {editing && (
        <PedidoModal
          pedido={editing}
          clientes={clientes}
          ciclos={ciclos}
          onClose={() => setEditing(null)}
          onSaved={closeAndRefresh}
        />
      )}
    </div>
  )
}
