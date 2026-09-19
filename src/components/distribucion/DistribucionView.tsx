'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatGTQ } from '@/lib/currency'

type Item = {
  id: string
  orderId: string
  productLink: string | null
  notes: string | null
  salePrice: number
  confirmed: boolean
  packed: boolean
  packedIn: string | null
  delivered: boolean
  client: {
    id: string
    fullName: string
    phones: string[]
    fulfillmentMethod: string
    zone: string
    deliveryAddress: string
    pickupPlace: { name: string } | null
  }
}

type CicloOption = { id: string; code: string; status: string }

type ClientGroup = {
  client: Item['client']
  items: Item[]
}

function groupByClient(items: Item[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>()
  for (const item of items) {
    const key = item.client.id
    if (!map.has(key)) map.set(key, { client: item.client, items: [] })
    map.get(key)!.items.push(item)
  }
  return Array.from(map.values()).sort((a, b) => a.client.fullName.localeCompare(b.client.fullName))
}

function groupKey(group: ClientGroup): string {
  if (group.client.fulfillmentMethod === 'PICKUP') {
    return group.client.pickupPlace?.name ?? 'Sin lugar de pickup asignado'
  }
  return group.client.zone?.trim() || 'Sin zona asignada'
}

export default function DistribucionView({
  items: initialItems,
  ciclos,
  selectedCycleId,
}: {
  items: Item[]
  ciclos: CicloOption[]
  selectedCycleId?: string
}) {
  const [cycleId, setCycleId] = useState(selectedCycleId ?? '')
  const [items, setItems] = useState<Item[]>(initialItems)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'delivered' | 'all'>('pending')
  const [loading, setLoading] = useState(false)

  async function loadItems(id: string) {
    if (!id) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/distribucion?cycleId=${id}`)
      const data = await res.json()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (cycleId && cycleId !== selectedCycleId) {
      loadItems(cycleId)
    }
    // Solo se dispara cuando el usuario cambia de ciclo manualmente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId])

  async function markDelivered(orderId: string, itemId: string) {
    await fetch(`/api/pedidos/${orderId}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivered: true }),
    })
    loadItems(cycleId)
  }

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (statusFilter === 'pending' && i.delivered) return false
      if (statusFilter === 'delivered' && !i.delivered) return false
      return true
    })
  }, [items, statusFilter])

  const pickupGroups = useMemo(() => {
    const groups = groupByClient(filtered.filter((i) => i.client.fulfillmentMethod === 'PICKUP'))
    const byPlace = new Map<string, ClientGroup[]>()
    for (const g of groups) {
      const key = groupKey(g)
      if (!byPlace.has(key)) byPlace.set(key, [])
      byPlace.get(key)!.push(g)
    }
    return Array.from(byPlace.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const deliveryGroups = useMemo(() => {
    const groups = groupByClient(filtered.filter((i) => i.client.fulfillmentMethod === 'DELIVERY'))
    const byZone = new Map<string, ClientGroup[]>()
    for (const g of groups) {
      const key = groupKey(g)
      if (!byZone.has(key)) byZone.set(key, [])
      byZone.get(key)!.push(g)
    }
    return Array.from(byZone.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  function renderClientCard(group: ClientGroup) {
    const total = group.items.reduce((sum, i) => sum + i.salePrice, 0)
    return (
      <div key={group.client.id} className="bg-white border border-brand-gray rounded-lg p-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-medium text-brand-black">{group.client.fullName}</p>
            {group.client.phones[0] && (
              <p className="text-xs text-brand-gray-dk">{group.client.phones[0]}</p>
            )}
            {group.client.fulfillmentMethod === 'DELIVERY' && group.client.deliveryAddress && (
              <p className="text-xs text-brand-gray-dk">{group.client.deliveryAddress}</p>
            )}
          </div>
          <p className="text-sm font-medium text-brand-black">{formatGTQ(total)}</p>
        </div>
        <ul className="space-y-1">
          {group.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="truncate pr-2">
                {item.productLink || item.notes || 'Producto'} · {formatGTQ(item.salePrice)}
                {item.packedIn && (
                  <span className="ml-1 text-xs text-brand-gray-dk">
                    ({item.packedIn === 'SUITCASE' ? 'maleta' : 'caja'})
                  </span>
                )}
              </span>
              {item.delivered ? (
                <span className="text-xs text-green-700 shrink-0">Entregado</span>
              ) : (
                <button
                  onClick={() => markDelivered(item.orderId, item.id)}
                  className="text-xs text-green-700 shrink-0"
                >
                  Entregar
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-4">Listas de distribución</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          className="px-3 py-2 border border-brand-gray rounded text-sm"
        >
          <option value="">Seleccionar ciclo...</option>
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 border border-brand-gray rounded text-sm"
        >
          <option value="pending">Pendientes de entregar</option>
          <option value="delivered">Entregados</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {loading && <p className="text-sm text-brand-gray-dk">Cargando...</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-bold text-brand-black mb-3">Pickup (por lugar)</h2>
            {pickupGroups.length === 0 && (
              <p className="text-sm text-brand-gray-dk">No hay clientes de pickup con estos filtros.</p>
            )}
            <div className="space-y-4">
              {pickupGroups.map(([place, groups]) => (
                <div key={place}>
                  <p className="text-sm font-medium text-brand-gray-dk mb-2">{place}</p>
                  <div className="space-y-2">{groups.map(renderClientCard)}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-bold text-brand-black mb-3">Delivery (por zona)</h2>
            {deliveryGroups.length === 0 && (
              <p className="text-sm text-brand-gray-dk">No hay clientes de delivery con estos filtros.</p>
            )}
            <div className="space-y-4">
              {deliveryGroups.map(([zone, groups]) => (
                <div key={zone}>
                  <p className="text-sm font-medium text-brand-gray-dk mb-2">{zone}</p>
                  <div className="space-y-2">{groups.map(renderClientCard)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
