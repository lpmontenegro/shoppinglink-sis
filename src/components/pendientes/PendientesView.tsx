'use client'

import { useEffect, useMemo, useState } from 'react'
import PhotoThumb from '@/components/PhotoThumb'
import { formatGTQ, formatUSD } from '@/lib/currency'

type Item = {
  id: string
  orderId: string
  productName: string | null
  photoUrl: string | null
  notes: string | null
  store: string | null
  purchaseType: string
  quantity: number
  costUsd: number | null
  salePrice: number | null
  suggestedPrice: number | null
  importRef: string | null
  clientId: string
  clientName: string
  unassigned: boolean
  packedIn: string | null
}

type CicloOption = { id: string; code: string; status: string }
type ClientOption = { id: string; fullName: string }
type Tab = 'cliente' | 'precio'

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function sourceLabel(i: Item) {
  return i.purchaseType === 'COURIER' ? 'Directo (solo traída)' : i.store || 'Compra'
}

// Lo que falta completar del ciclo: (1) productos sin cliente → asignarlos;
// (2) productos con precio pendiente → poner el precio final. El precio
// sugerido es solo referencia (botón "usar"); nunca se guarda solo.
export default function PendientesView({
  initialItems,
  ciclos,
  selectedCycleId,
}: {
  initialItems: Item[]
  ciclos: CicloOption[]
  selectedCycleId?: string
}) {
  const [cycleId, setCycleId] = useState(selectedCycleId ?? '')
  const [items, setItems] = useState<Item[]>(initialItems)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [tab, setTab] = useState<Tab>(initialItems.some((i) => i.unassigned) ? 'cliente' : 'precio')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [assignTo, setAssignTo] = useState<Record<string, string>>({})
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({})
  const [costDraft, setCostDraft] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  async function loadClients() {
    const res = await fetch('/api/clientes')
    const data = await res.json()
    setClients(data.filter((c: any) => c.active !== false).map((c: any) => ({ id: c.id, fullName: c.fullName })))
  }
  useEffect(() => {
    loadClients()
  }, [])

  async function load(id: string) {
    if (!id) return setItems([])
    setLoading(true)
    try {
      const res = await fetch(`/api/pendientes?cycleId=${id}`)
      setItems(await res.json())
      setSaved({})
    } finally {
      setLoading(false)
    }
  }

  const unassigned = useMemo(() => items.filter((i) => i.unassigned), [items])
  const noPrice = useMemo(() => items.filter((i) => !i.unassigned && i.salePrice == null), [items])

  const filtered = (list: Item[]) => {
    const nq = norm(q)
    if (!nq) return list
    return list.filter((i) => norm(`${i.clientName} ${i.productName ?? ''} ${i.store ?? ''}`).includes(nq))
  }

  async function assign(item: Item) {
    setError('')
    const typed = (assignTo[item.id] ?? '').trim()
    if (!typed) return setError('Escribe o elige el cliente.')
    const match = clients.find((c) => norm(c.fullName) === norm(typed))
    if (!match && !window.confirm(`"${typed}" no existe como cliente. ¿Crearlo como cliente nuevo?`)) return
    const res = await fetch(`/api/items/${item.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(match ? { clientId: match.id } : { newClientName: typed }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) return setError('No se pudo asignar el producto.')
    setSaved((s) => ({ ...s, [item.id]: `Asignado a ${data.clientName}` }))
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, unassigned: false, clientId: data.clientId, clientName: data.clientName } : i))
    )
    if (!match) loadClients()
  }

  async function savePrice(item: Item) {
    setError('')
    const raw = priceDraft[item.id]
    const costRaw = costDraft[item.id]
    const body: Record<string, unknown> = {}
    if (raw !== undefined && raw !== '') body.salePrice = parseFloat(raw)
    if (costRaw !== undefined && costRaw !== '') body.costUsd = parseFloat(costRaw)
    if (Object.keys(body).length === 0) return
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return setError('No se pudo guardar.')
    const data = await res.json()
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, salePrice: data.salePrice, costUsd: data.costUsd } : i)))
    setSaved((s) => ({ ...s, [item.id]: data.salePrice != null ? `Guardado ${formatGTQ(data.salePrice)}` : 'Costo guardado' }))
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-3 py-2 ${tab === t ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray-dk'}`}
    >
      {label}
    </button>
  )

  // Agrupado por cliente para la pestaña de precios
  const priceGroups = useMemo(() => {
    const map = new Map<string, { name: string; items: Item[] }>()
    filtered(noPrice).forEach((i) => {
      if (!map.has(i.clientId)) map.set(i.clientId, { name: i.clientName, items: [] })
      map.get(i.clientId)!.items.push(i)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noPrice, q])

  const pendingUnassigned = unassigned.filter((i) => !saved[i.id]).length
  const pendingNoPrice = noPrice.filter((i) => !saved[i.id]).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-1">Pendientes</h1>
      <p className="text-sm text-brand-gray-dk mb-4">
        Productos que todavía no tienen cliente o precio. Mientras un producto no tenga precio, no se suma a ningún estado
        de cuenta.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={cycleId}
          onChange={(e) => {
            setCycleId(e.target.value)
            load(e.target.value)
          }}
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
          {tabBtn('cliente', `Sin cliente (${pendingUnassigned})`)}
          {tabBtn('precio', `Sin precio (${pendingNoPrice})`)}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente, producto o tienda..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-brand-gray rounded text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {loading && <p className="text-sm text-brand-gray-dk">Cargando...</p>}

      <datalist id="clientes-list">
        {clients.map((c) => (
          <option key={c.id} value={c.fullName} />
        ))}
      </datalist>

      {!loading && tab === 'cliente' && (
        <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
          {filtered(unassigned).length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-brand-gray-dk">No hay productos sin cliente. 🎉</p>
          )}
          {filtered(unassigned).map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-brand-gray-lt first:border-t-0">
              {i.photoUrl && <PhotoThumb src={i.photoUrl} size="w-9 h-9" />}
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm text-brand-black">
                  {i.productName || i.notes || 'Producto'}
                  {i.quantity > 1 && <span className="ml-1 text-xs font-medium text-brand-blue">×{i.quantity}</span>}
                </p>
                <p className="text-xs text-brand-gray-dk">
                  {sourceLabel(i)}
                  {i.costUsd != null && ` · costo ${formatUSD(i.costUsd)}`}
                  {i.salePrice != null && ` · precio ${formatGTQ(i.salePrice)}`}
                  {i.importRef && ` · ${i.importRef}`}
                </p>
              </div>
              {saved[i.id] ? (
                <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">✓ {saved[i.id]}</span>
              ) : (
                <>
                  <input
                    list="clientes-list"
                    value={assignTo[i.id] ?? ''}
                    onChange={(e) => setAssignTo((s) => ({ ...s, [i.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && assign(i)}
                    placeholder="Cliente..."
                    className="w-56 px-2 py-1.5 border border-brand-gray rounded text-sm"
                  />
                  <button onClick={() => assign(i)} className="px-3 py-1.5 bg-brand-blue text-white rounded text-sm">
                    Asignar
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'precio' && (
        <div className="space-y-3">
          {priceGroups.length === 0 && (
            <p className="py-6 text-center text-sm text-brand-gray-dk">No hay productos con precio pendiente. 🎉</p>
          )}
          {priceGroups.map(([clientId, g]) => (
            <div key={clientId} className="bg-white border border-brand-gray rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-brand-gray-lt text-sm font-medium text-brand-black">{g.name}</div>
              {g.items.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-brand-gray-lt">
                  {i.photoUrl && <PhotoThumb src={i.photoUrl} size="w-9 h-9" />}
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm text-brand-black">
                      {i.productName || i.notes || 'Producto'}
                      {i.quantity > 1 && <span className="ml-1 text-xs font-medium text-brand-blue">×{i.quantity}</span>}
                    </p>
                    <p className="text-xs text-brand-gray-dk">
                      {sourceLabel(i)}
                      {i.costUsd != null && ` · costo ${formatUSD(i.costUsd)}`}
                    </p>
                  </div>
                  {saved[i.id] ? (
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">✓ {saved[i.id]}</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {i.purchaseType === 'ADVANCE' && i.costUsd == null && (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Costo $"
                          value={costDraft[i.id] ?? ''}
                          onChange={(e) => setCostDraft((s) => ({ ...s, [i.id]: e.target.value }))}
                          className="w-24 px-2 py-1.5 border border-brand-gray rounded text-sm"
                        />
                      )}
                      {i.suggestedPrice != null && (
                        <button
                          onClick={() => setPriceDraft((s) => ({ ...s, [i.id]: String(i.suggestedPrice) }))}
                          className="text-xs text-brand-blue underline whitespace-nowrap"
                          title="Solo es una sugerencia — revisa antes de guardar"
                        >
                          Sugerido {formatGTQ(i.suggestedPrice)} (usar)
                        </button>
                      )}
                      <input
                        type="number"
                        min={0}
                        step="1"
                        placeholder="Precio Q c/u"
                        value={priceDraft[i.id] ?? ''}
                        onChange={(e) => setPriceDraft((s) => ({ ...s, [i.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && savePrice(i)}
                        className="w-28 px-2 py-1.5 border border-brand-gray rounded text-sm"
                      />
                      <button onClick={() => savePrice(i)} className="px-3 py-1.5 bg-brand-blue text-white rounded text-sm">
                        Guardar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
