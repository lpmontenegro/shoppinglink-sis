'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { formatGTQ } from '@/lib/currency'
import PhotoThumb from '@/components/PhotoThumb'

type Item = {
  id: string
  orderId: string
  productName: string | null
  photoUrl: string | null
  productLink: string | null
  notes: string | null
  quantity: number
  salePrice: number
  delivered: boolean
  client: {
    id: string
    fullName: string
    phones: string[]
    fulfillmentMethod: string
    zone: string
    deliveryAddress: string
    pickupPlace: { name: string } | null
    balance: number
  }
}

type CicloOption = { id: string; code: string; status: string }
type PackedIn = 'SUITCASE' | 'BOX'

type ClientGroup = {
  client: Item['client']
  items: Item[]
}

type ZoneGroup = {
  key: string
  clients: ClientGroup[]
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

function zoneKeyFor(client: Item['client']): string {
  if (client.fulfillmentMethod === 'PICKUP') {
    return client.pickupPlace?.name ?? 'Sin lugar de pickup asignado'
  }
  return client.zone?.trim() || 'Sin zona asignada'
}

function groupByZone(items: Item[]): ZoneGroup[] {
  const byZone = new Map<string, Item[]>()
  for (const item of items) {
    const key = zoneKeyFor(item.client)
    if (!byZone.has(key)) byZone.set(key, [])
    byZone.get(key)!.push(item)
  }
  return Array.from(byZone.entries())
    .map(([key, its]) => ({ key, items: its, clients: groupByClient(its) }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

function stats(items: Item[]) {
  const total = items.length
  const delivered = items.filter((i) => i.delivered).length
  return { total, delivered, pct: total === 0 ? 0 : Math.round((delivered / total) * 100) }
}

export default function DistribucionView({
  initialItems,
  initialPackedIn,
  ciclos,
  selectedCycleId,
}: {
  initialItems: Item[]
  initialPackedIn: PackedIn
  ciclos: CicloOption[]
  selectedCycleId?: string
}) {
  const [cycleId, setCycleId] = useState(selectedCycleId ?? '')
  const [packedIn, setPackedIn] = useState<PackedIn>(initialPackedIn)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ PICKUP: true, DELIVERY: true })
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  async function loadItems(id: string, tab: PackedIn) {
    if (!id) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/distribucion?cycleId=${id}&packedIn=${tab}`)
      const data = await res.json()
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }
    loadItems(cycleId, packedIn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, packedIn])

  async function toggleDelivered(item: Item) {
    setBusy((prev) => ({ ...prev, [item.id]: true }))
    // Optimista: refleja el cambio antes de que responda el servidor, para
    // que marcar/desmarcar se sienta instantáneo mientras se organiza todo.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, delivered: !i.delivered } : i)))
    try {
      await fetch(`/api/pedidos/${item.orderId}/items/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivered: !item.delivered }),
      })
    } finally {
      setBusy((prev) => ({ ...prev, [item.id]: false }))
      loadItems(cycleId, packedIn)
    }
  }

  async function markGroupDelivered(group: ZoneGroup) {
    const pending = group.items.filter((i) => !i.delivered)
    if (pending.length === 0) return
    await Promise.all(
      pending.map((i) =>
        fetch(`/api/pedidos/${i.orderId}/items/${i.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delivered: true }),
        })
      )
    )
    loadItems(cycleId, packedIn)
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: prev[key] === false ? true : false }))
  }
  function isGroupOpen(key: string) {
    return openGroups[key] !== false
  }

  const pickupItems = useMemo(() => items.filter((i) => i.client.fulfillmentMethod === 'PICKUP'), [items])
  const deliveryItems = useMemo(() => items.filter((i) => i.client.fulfillmentMethod === 'DELIVERY'), [items])
  const pickupGroups = useMemo(() => groupByZone(pickupItems), [pickupItems])
  const deliveryGroups = useMemo(() => groupByZone(deliveryItems), [deliveryItems])
  const overall = stats(items)

  function renderItemRow(item: Item) {
    // La foto va fuera del <label> (aunque esté dentro visualmente) para que
    // tocarla abra la imagen en una pestaña nueva en vez de marcar/desmarcar
    // el checkbox — solo el checkbox y el texto activan el toggle.
    return (
      <div
        key={item.id}
        className={`flex items-center gap-3 px-4 py-2 border-t border-brand-gray-lt ${
          item.delivered ? 'opacity-50' : ''
        }`}
      >
        {item.photoUrl && <PhotoThumb src={item.photoUrl} size="w-9 h-9" />}
        <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          <input
            type="checkbox"
            checked={item.delivered}
            disabled={busy[item.id]}
            onChange={() => toggleDelivered(item)}
            className="w-4 h-4 shrink-0"
          />
          <span className="flex-1 min-w-0">
            <span className={`block text-sm font-medium text-brand-black truncate ${item.delivered ? 'line-through' : ''}`}>
              {item.productName || item.productLink || item.notes || 'Producto'}
              {item.quantity > 1 && <span className="ml-1 text-xs font-medium text-brand-blue">×{item.quantity}</span>}
            </span>
            {item.productName && item.notes && (
              <span className="block text-xs text-brand-gray-dk italic truncate">Nota: {item.notes}</span>
            )}
          </span>
          <span className="text-sm font-medium text-brand-black shrink-0">
            {formatGTQ(item.salePrice * item.quantity)}
          </span>
        </label>
      </div>
    )
  }

  function renderClientCard(group: ClientGroup) {
    const s = stats(group.items)
    const total = group.items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0)
    return (
      <div key={group.client.id} className="border-t border-brand-gray">
        <div className="flex justify-between items-start px-4 py-2 bg-white">
          <div>
            <p className="font-medium text-brand-black">{group.client.fullName}</p>
            <p className="text-xs text-brand-gray-dk">
              {group.client.fulfillmentMethod === 'DELIVERY' && group.client.deliveryAddress
                ? group.client.deliveryAddress
                : 'N/A'}
            </p>
            {group.client.phones[0] && <p className="text-xs text-brand-gray-dk">{group.client.phones[0]}</p>}
            {group.client.balance > 0 && (
              <p className="mt-1 inline-block text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                Saldo pendiente (ciclo): {formatGTQ(group.client.balance)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-medium text-brand-black">{formatGTQ(total)}</p>
            <p className="text-xs text-brand-gray-dk">
              {group.items.length} producto{group.items.length === 1 ? '' : 's'} · {s.delivered}/{s.total} entregados
            </p>
          </div>
        </div>
        {group.items.map(renderItemRow)}
      </div>
    )
  }

  function renderSection(label: string, groups: ZoneGroup[], sectionKey: string) {
    const allItems = groups.flatMap((g) => g.items)
    const s = stats(allItems)
    const open = openSections[sectionKey] !== false

    return (
      <div className="bg-white border border-brand-gray rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex justify-between items-center px-4 py-2 bg-brand-blue text-white text-sm font-bold"
        >
          <span>{label}</span>
          <span>
            {s.delivered}/{s.total} entregados {open ? '▲ Ocultar' : '▼ Mostrar'}
          </span>
        </button>

        {open && (
          <div>
            {groups.length === 0 && (
              <p className="px-4 py-4 text-sm text-brand-gray-dk">No hay productos en esta sección.</p>
            )}
            {groups.map((group) => {
              const gs = stats(group.items)
              const total = group.items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0)
              const gOpen = isGroupOpen(sectionKey + ':' + group.key)
              return (
                <div key={group.key} className="border-t border-brand-gray">
                  <button
                    onClick={() => toggleGroup(sectionKey + ':' + group.key)}
                    className="w-full flex justify-between items-center px-4 py-2 bg-brand-gray-lt text-left"
                  >
                    <div>
                      <span className="font-medium text-brand-black">{group.key}</span>
                      <span className="ml-2 text-xs text-brand-gray-dk">
                        {group.clients.length} cliente{group.clients.length === 1 ? '' : 's'} · {formatGTQ(total)} ·{' '}
                        {gs.delivered}/{gs.total} entregados
                      </span>
                    </div>
                    <span className="flex items-center gap-2 text-xs shrink-0">
                      {gs.total - gs.delivered > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                          {gs.total - gs.delivered} pendiente{gs.total - gs.delivered === 1 ? '' : 's'}
                        </span>
                      )}
                      {gOpen ? '▲' : '▼'}
                    </span>
                  </button>
                  {gOpen && (
                    <div>
                      {gs.delivered < gs.total && (
                        <div className="px-4 py-2 text-right">
                          <button
                            onClick={() => markGroupDelivered(group)}
                            className="text-xs text-brand-blue"
                          >
                            Marcar todo como entregado
                          </button>
                        </div>
                      )}
                      {group.clients.map(renderClientCard)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-4">Distribución</h1>

      <div className="flex flex-wrap gap-3 mb-4">
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

        <div className="inline-flex rounded border border-brand-gray overflow-hidden text-sm">
          <button
            onClick={() => setPackedIn('SUITCASE')}
            className={`px-3 py-2 ${packedIn === 'SUITCASE' ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray-dk'}`}
          >
            🧳 Maleta
          </button>
          <button
            onClick={() => setPackedIn('BOX')}
            className={`px-3 py-2 ${packedIn === 'BOX' ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray-dk'}`}
          >
            📦 Caja
          </button>
        </div>
      </div>

      <p className="text-xs text-brand-gray-dk mb-4">
        {packedIn === 'SUITCASE'
          ? 'Productos que vienen en maleta — listos para entregar en cuanto regresan las administradoras del viaje.'
          : 'Productos que vienen en caja — listos para entregar hasta que llegue la caja por courier.'}
      </p>

      <div className="bg-white border border-brand-gray rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-brand-black">Progreso de entregas</span>
          <span className="font-bold text-brand-black">
            {overall.delivered}/{overall.total} ({overall.pct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-brand-gray-lt rounded overflow-hidden">
          <div className="h-full bg-brand-blue" style={{ width: `${overall.pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-brand-gray-dk">
          <span>
            {deliveryGroups.length} zona{deliveryGroups.length === 1 ? '' : 's'} delivery · {pickupGroups.length} pickup
          </span>
          <span>{overall.total - overall.delivered} pendientes</span>
        </div>
      </div>

      {loading && <p className="text-sm text-brand-gray-dk">Cargando...</p>}

      {!loading && !cycleId && (
        <p className="text-sm text-brand-gray-dk">Selecciona un ciclo para ver su distribución.</p>
      )}

      {!loading && cycleId && overall.total === 0 && (
        <p className="text-sm text-brand-gray-dk">
          Todavía no hay productos empacados en {packedIn === 'SUITCASE' ? 'maleta' : 'caja'} para este ciclo.
        </p>
      )}

      {!loading && overall.total > 0 && (
        <>
          {renderSection('PICKUP', pickupGroups, 'PICKUP')}
          {renderSection('DELIVERY', deliveryGroups, 'DELIVERY')}
        </>
      )}
    </div>
  )
}
