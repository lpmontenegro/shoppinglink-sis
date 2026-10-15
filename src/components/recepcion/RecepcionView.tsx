'use client'

import { useMemo, useState } from 'react'
import PhotoThumb from '@/components/PhotoThumb'

type Item = {
  id: string
  orderId: string
  productName: string | null
  photoUrl: string | null
  notes: string | null
  store: string | null
  purchaseType: string
  quantity: number
  salePrice: number | null
  packed: boolean
  packedIn: string | null
  received: boolean
  problem: boolean
  canceledReason: string | null
  delivered: boolean
  clientId: string
  clientName: string
  unassigned: boolean
}

type CicloOption = { id: string; code: string; status: string }
type Tab = 'maleta' | 'caja' | 'problemas'

type State = 'pending' | 'suitcase' | 'boxPending' | 'boxReceived' | 'problem'

function stateOf(i: Item): State {
  if (i.problem) return 'problem'
  if (i.packed && i.packedIn === 'SUITCASE') return 'suitcase'
  if (i.packed && i.packedIn === 'BOX') return i.received ? 'boxReceived' : 'boxPending'
  return 'pending'
}

const STATE_LABEL: Record<State, { label: string; cls: string }> = {
  pending: { label: 'Sin revisar', cls: 'bg-brand-gray-lt text-brand-gray-dk' },
  suitcase: { label: '🧳 Llegó en maleta', cls: 'bg-green-50 text-green-700' },
  boxPending: { label: '📦 Viene en caja', cls: 'bg-blue-50 text-blue-700' },
  boxReceived: { label: '📦 Llegó en caja', cls: 'bg-green-50 text-green-700' },
  problem: { label: '⚠️ Problema', cls: 'bg-red-50 text-red-700' },
}

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Recepción en Guatemala: al desempacar las maletas se marca, producto por
// producto, qué llegó. Lo que no llegó en maleta viene en la caja (botón
// masivo al terminar). Cuando llega la caja se marca lo recibido ahí. Un
// producto dañado/equivocado se marca con problema: sale de la venta y queda
// en la lista de devoluciones.
export default function RecepcionView({
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
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('maleta')
  const [q, setQ] = useState('')
  const [onlyPending, setOnlyPending] = useState(false)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [msg, setMsg] = useState('')

  async function load(id: string) {
    if (!id) return setItems([])
    setLoading(true)
    try {
      const res = await fetch(`/api/recepcion?cycleId=${id}`)
      setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function patch(item: Item, body: Record<string, unknown>, optimistic: Partial<Item>) {
    setBusy((b) => ({ ...b, [item.id]: true }))
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...optimistic } : i)))
    try {
      const res = await fetch(`/api/pedidos/${item.orderId}/items/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setMsg('No se pudo guardar el cambio — se recargó la lista.')
        load(cycleId)
      }
    } finally {
      setBusy((b) => ({ ...b, [item.id]: false }))
    }
  }

  const arrivedSuitcase = (i: Item) =>
    patch(i, { confirmed: true, packed: true, packedIn: 'SUITCASE', received: true }, { packed: true, packedIn: 'SUITCASE', received: true })
  const comesInBox = (i: Item) =>
    patch(i, { confirmed: true, packed: true, packedIn: 'BOX', received: false }, { packed: true, packedIn: 'BOX', received: false })
  const arrivedBox = (i: Item) => patch(i, { received: true }, { received: true })
  const undoBoxArrival = (i: Item) => patch(i, { received: false }, { received: false })
  const undo = (i: Item) => patch(i, { packed: false, received: false }, { packed: false, packedIn: null, received: false })
  function markProblem(i: Item) {
    const reason = window.prompt('¿Qué problema tiene? (dañado, equivocado, talla incorrecta...) — no se venderá y queda para devolver.')
    if (reason === null) return
    patch(i, { problem: true, canceledReason: `Problema: ${reason || 'sin detalle'}` }, { problem: true, canceledReason: `Problema: ${reason}` })
  }
  const clearProblem = (i: Item) => patch(i, { problem: false }, { problem: false, canceledReason: null })

  async function remainingToBox() {
    const n = items.filter((i) => stateOf(i) === 'pending').length
    if (n === 0) return
    if (!window.confirm(`Pasar ${n} producto${n === 1 ? '' : 's'} sin revisar a "Viene en caja"? Hazlo solo cuando ya terminaste de desempacar TODAS las maletas.`)) return
    const res = await fetch('/api/recepcion/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId, action: 'remainingToBox' }),
    })
    const data = await res.json().catch(() => null)
    setMsg(res.ok ? `${data?.updated ?? n} productos pasados a la caja.` : 'No se pudo hacer el cambio.')
    load(cycleId)
  }

  const counts = useMemo(() => {
    const c: Record<State, number> = { pending: 0, suitcase: 0, boxPending: 0, boxReceived: 0, problem: 0 }
    items.forEach((i) => c[stateOf(i)]++)
    return c
  }, [items])

  const visible = useMemo(() => {
    const nq = norm(q.trim())
    return items.filter((i) => {
      const st = stateOf(i)
      if (tab === 'maleta' && !(st === 'pending' || st === 'suitcase')) return false
      if (tab === 'caja' && !(st === 'boxPending' || st === 'boxReceived')) return false
      if (tab === 'problemas' && st !== 'problem') return false
      if (onlyPending && tab === 'maleta' && st !== 'pending') return false
      if (onlyPending && tab === 'caja' && st !== 'boxPending') return false
      if (nq && !norm(`${i.clientName} ${i.productName ?? ''} ${i.store ?? ''}`).includes(nq)) return false
      return true
    })
  }, [items, tab, q, onlyPending])

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; unassigned: boolean; items: Item[] }>()
    visible.forEach((i) => {
      if (!map.has(i.clientId)) map.set(i.clientId, { name: i.clientName, unassigned: i.unassigned, items: [] })
      map.get(i.clientId)!.items.push(i)
    })
    return Array.from(map.entries())
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => (a.unassigned === b.unassigned ? a.name.localeCompare(b.name) : a.unassigned ? 1 : -1))
  }, [visible])

  const total = items.filter((i) => !i.problem).length
  const reviewed = total - counts.pending
  const pct = total === 0 ? 0 : Math.round((reviewed / total) * 100)

  function actions(i: Item) {
    const st = stateOf(i)
    const dis = busy[i.id] || i.delivered
    const btn = 'px-2 py-1 rounded text-xs border whitespace-nowrap disabled:opacity-40'
    if (st === 'pending')
      return (
        <>
          <button disabled={dis} onClick={() => arrivedSuitcase(i)} className={`${btn} bg-green-600 text-white border-green-600`}>
            ✓ Llegó en maleta
          </button>
          <button disabled={dis} onClick={() => comesInBox(i)} className={`${btn} border-brand-gray text-brand-black`}>
            📦 Viene en caja
          </button>
          <button disabled={dis} onClick={() => markProblem(i)} className={`${btn} border-red-200 text-red-700`}>
            ⚠️ Problema
          </button>
        </>
      )
    if (st === 'suitcase')
      return (
        <>
          <button disabled={dis} onClick={() => markProblem(i)} className={`${btn} border-red-200 text-red-700`}>
            ⚠️ Problema
          </button>
          <button disabled={dis} onClick={() => undo(i)} className={`${btn} border-brand-gray text-brand-gray-dk`}>
            Deshacer
          </button>
        </>
      )
    if (st === 'boxPending')
      return (
        <>
          <button disabled={dis} onClick={() => arrivedBox(i)} className={`${btn} bg-green-600 text-white border-green-600`}>
            ✓ Llegó en caja
          </button>
          <button disabled={dis} onClick={() => markProblem(i)} className={`${btn} border-red-200 text-red-700`}>
            ⚠️ Problema
          </button>
          <button disabled={dis} onClick={() => undo(i)} className={`${btn} border-brand-gray text-brand-gray-dk`}>
            Deshacer
          </button>
        </>
      )
    if (st === 'boxReceived')
      return (
        <>
          <button disabled={dis} onClick={() => markProblem(i)} className={`${btn} border-red-200 text-red-700`}>
            ⚠️ Problema
          </button>
          <button disabled={dis} onClick={() => undoBoxArrival(i)} className={`${btn} border-brand-gray text-brand-gray-dk`}>
            Deshacer
          </button>
        </>
      )
    return (
      <button disabled={busy[i.id]} onClick={() => clearProblem(i)} className={`${btn} border-brand-gray text-brand-gray-dk`}>
        Quitar problema (reactivar)
      </button>
    )
  }

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      className={`px-3 py-2 ${tab === t ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray-dk'}`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-1">Recepción</h1>
      <p className="text-sm text-brand-gray-dk mb-4">
        Al desempacar: marca lo que llegó en la maleta. Lo que no llegó viene en la caja. Cuando llegue la caja, marca lo
        recibido ahí. Solo lo recibido se puede entregar en Distribución.
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
          {tabBtn('maleta', `🧳 Maleta (${counts.pending + counts.suitcase})`)}
          {tabBtn('caja', `📦 Caja (${counts.boxPending + counts.boxReceived})`)}
          {tabBtn('problemas', `⚠️ Problemas (${counts.problem})`)}
        </div>
      </div>

      <div className="bg-white border border-brand-gray rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2 text-sm">
          <span className="font-bold text-brand-black">Revisados</span>
          <span className="font-bold text-brand-black">
            {reviewed}/{total} ({pct}%)
          </span>
        </div>
        <div className="w-full h-2 bg-brand-gray-lt rounded overflow-hidden">
          <div className="h-full bg-brand-blue" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-brand-gray-dk">
          <span>Sin revisar: {counts.pending}</span>
          <span>Llegó en maleta: {counts.suitcase}</span>
          <span>Viene en caja: {counts.boxPending}</span>
          <span>Llegó en caja: {counts.boxReceived}</span>
          <span>Con problema: {counts.problem}</span>
        </div>
        {tab === 'maleta' && counts.pending > 0 && (
          <button onClick={remainingToBox} className="mt-3 text-xs text-brand-blue underline">
            Terminé de desempacar: pasar los {counts.pending} sin revisar a &quot;Viene en caja&quot;
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar cliente, producto o tienda..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-brand-gray rounded text-sm"
        />
        {tab !== 'problemas' && (
          <label className="flex items-center gap-2 text-sm text-brand-gray-dk">
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
            Solo pendientes
          </label>
        )}
      </div>

      {msg && <p className="text-sm text-brand-blue mb-3">{msg}</p>}
      {loading && <p className="text-sm text-brand-gray-dk">Cargando...</p>}
      {!loading && groups.length === 0 && (
        <p className="text-sm text-brand-gray-dk py-6 text-center">No hay productos en esta vista.</p>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="bg-white border border-brand-gray rounded-lg overflow-hidden">
            <div className={`px-4 py-2 text-sm font-medium ${g.unassigned ? 'bg-amber-50 text-amber-800' : 'bg-brand-gray-lt text-brand-black'}`}>
              {g.name} <span className="text-xs text-brand-gray-dk font-normal">· {g.items.length} producto{g.items.length === 1 ? '' : 's'}</span>
              {g.unassigned && <span className="text-xs font-normal"> — asígnalos en Pendientes</span>}
            </div>
            {g.items.map((i) => {
              const st = STATE_LABEL[stateOf(i)]
              return (
                <div key={i.id} className="flex flex-wrap items-center gap-2 px-4 py-2 border-t border-brand-gray-lt">
                  {i.photoUrl && <PhotoThumb src={i.photoUrl} size="w-9 h-9" />}
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm text-brand-black">
                      {i.productName || i.notes || 'Producto'}
                      {i.quantity > 1 && <span className="ml-1 text-xs font-medium text-brand-blue">×{i.quantity}</span>}
                    </p>
                    <p className="text-xs text-brand-gray-dk">
                      {i.purchaseType === 'COURIER' ? 'Directo' : i.store || '—'}
                      {i.problem && i.canceledReason ? ` · ${i.canceledReason}` : ''}
                      {i.delivered ? ' · ya entregado' : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                  <div className="flex flex-wrap gap-1">{actions(i)}</div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
