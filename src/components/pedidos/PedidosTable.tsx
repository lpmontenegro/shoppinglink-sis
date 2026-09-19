'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PedidoModal from './PedidoModal'
import StatusBadge from '@/components/StatusBadge'
import { formatGTQ, formatUSD } from '@/lib/currency'

type Pedido = {
  id: string
  clientId: string
  cycleId: string
  purchaseType: 'ADVANCE' | 'COURIER'
  productLink: string | null
  costUsd: string | number | null
  exchangeRate: string | number
  cost: string | number
  salePrice: string | number
  confirmed: boolean
  packed: boolean
  packedIn: string | null
  delivered: boolean
  canceled: boolean
  canceledReason: string | null
  notes: string | null
  client: { id: string; fullName: string }
  cycle: { id: string; code: string; status: string }
}

type ClienteOption = { id: string; fullName: string }
type CicloOption = { id: string; code: string; status: string }

function orderStatus(p: Pedido): { label: string; color: string } {
  if (p.canceled) return { label: 'Cancelado', color: 'text-red-700 bg-red-50' }
  if (p.delivered) return { label: 'Entregado', color: 'text-green-700 bg-green-50' }
  if (p.packed) return { label: 'Empacado', color: 'text-purple-700 bg-purple-50' }
  if (p.confirmed) return { label: 'Confirmado', color: 'text-blue-700 bg-blue-50' }
  return { label: 'Pendiente', color: 'text-brand-gray-dk bg-brand-gray-lt' }
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
      if (statusFilter === 'pending' && (p.delivered || p.canceled)) return false
      if (statusFilter === 'delivered' && !p.delivered) return false
      if (statusFilter === 'canceled' && !p.canceled) return false
      return true
    })
  }, [pedidos, cycleFilter, statusFilter, clientFilter])

  function closeAndRefresh() {
    setEditing(null)
    setCreating(false)
    router.refresh()
  }

  async function patchStatus(id: string, data: Record<string, unknown>) {
    await fetch(`/api/pedidos/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    router.refresh()
  }

  function cancelar(id: string) {
    const reason = window.prompt('Motivo de cancelación:')
    if (reason === null) return
    patchStatus(id, { canceled: true, canceledReason: reason })
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

      <div className="bg-white border border-brand-gray rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-gray-lt text-left text-brand-gray-dk">
            <tr>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Ciclo</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Costo</th>
              <th className="px-4 py-2">Venta</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const status = orderStatus(p)
              return (
                <tr key={p.id} className="border-t border-brand-gray align-top">
                  <td className="px-4 py-2 font-medium text-brand-black whitespace-nowrap">
                    {p.client.fullName}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{p.cycle.code}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {p.purchaseType === 'ADVANCE' ? 'Anticipada' : 'Courier'}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {formatGTQ(p.cost)}
                    {p.costUsd != null && (
                      <span className="block text-xs text-brand-gray-dk">
                        {formatUSD(p.costUsd)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatGTQ(p.salePrice)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge label={status.label} colorClass={status.color} />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                    <button onClick={() => setEditing(p)} className="text-brand-blue">
                      Editar
                    </button>
                    {!p.canceled && !p.delivered && (
                      <>
                        {!p.confirmed && (
                          <button
                            onClick={() => patchStatus(p.id, { confirmed: true })}
                            className="text-brand-gray-dk"
                          >
                            Confirmar
                          </button>
                        )}
                        {!p.packed && (
                          <>
                            <button
                              onClick={() =>
                                patchStatus(p.id, { packed: true, packedIn: 'SUITCASE' })
                              }
                              className="text-brand-gray-dk"
                            >
                              Empacar (maleta)
                            </button>
                            <button
                              onClick={() => patchStatus(p.id, { packed: true, packedIn: 'BOX' })}
                              className="text-brand-gray-dk"
                            >
                              Empacar (caja)
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => patchStatus(p.id, { delivered: true })}
                          className="text-green-700"
                        >
                          Entregar
                        </button>
                        <button onClick={() => cancelar(p.id)} className="text-red-600">
                          Cancelar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-brand-gray-dk">
                  No hay pedidos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
