'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import StoreVisitModal from './StoreVisitModal'
import OfferItemModal from './OfferItemModal'
import StatusBadge from '@/components/StatusBadge'
import { formatGTQ, formatUSD } from '@/lib/currency'

type ClienteOption = { id: string; fullName: string }
type CicloOption = { id: string; code: string; status: string; taxRate: number }

type Selection = {
  id: string
  clientId: string
  quantity: number
  orderItemId: string | null
  client: { id: string; fullName: string }
}

type OfferItem = {
  id: string
  photoUrl: string | null
  productName: string
  costUsd: number
  exchangeRate: number
  cost: number
  suggestedPrice: number
  finalPrice: number
  purchased: boolean
  notes: string | null
  selections: Selection[]
}

type StoreVisit = {
  id: string
  cycleId: string
  store: string
  visitDate: string | Date
  status: 'DRAFT' | 'PUBLISHED' | 'DONE'
  notes: string | null
  offers: OfferItem[]
}

const VISIT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicada',
  DONE: 'Cerrada',
}
const VISIT_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'text-brand-gray-dk bg-brand-gray-lt',
  PUBLISHED: 'text-green-700 bg-green-50',
  DONE: 'text-indigo-700 bg-indigo-50',
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function claimedQty(offer: OfferItem) {
  return offer.selections.reduce((sum, s) => sum + s.quantity, 0)
}

function buildWhatsAppText(visit: StoreVisit) {
  const lines = [`🛍️ Ofertas de *${visit.store}* — ${fmtDate(visit.visitDate)}`, '']
  visit.offers.forEach((o, i) => {
    lines.push(`${i + 1}. ${o.productName} — ${formatGTQ(o.finalPrice)}${o.photoUrl ? ` (foto: ${o.photoUrl})` : ''}`)
  })
  lines.push('', 'Contesten con el número y la cantidad que quieren 🙂')
  return lines.join('\n')
}

export default function TiendaView({
  visits,
  clientes,
  ciclos,
  defaultCycleId,
}: {
  visits: StoreVisit[]
  clientes: ClienteOption[]
  ciclos: CicloOption[]
  defaultCycleId?: string
}) {
  const router = useRouter()
  const [cycleFilter, setCycleFilter] = useState(defaultCycleId ?? 'all')
  const [creatingVisit, setCreatingVisit] = useState(false)
  const [editingVisit, setEditingVisit] = useState<StoreVisit | null>(null)
  const [offerModal, setOfferModal] = useState<{ visitId: string; offer?: OfferItem } | null>(null)
  const [selClientId, setSelClientId] = useState<Record<string, string>>({})
  const [selQty, setSelQty] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (cycleFilter === 'all') return visits
    return visits.filter((v) => v.cycleId === cycleFilter)
  }, [visits, cycleFilter])

  function taxRateFor(cycleId: string) {
    return ciclos.find((c) => c.id === cycleId)?.taxRate ?? 7.5
  }

  function refresh() {
    setCreatingVisit(false)
    setEditingVisit(null)
    setOfferModal(null)
    router.refresh()
  }

  async function setVisitStatus(visit: StoreVisit, status: string) {
    await fetch(`/api/store-visits/${visit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  async function togglePurchased(visitId: string, offer: OfferItem) {
    await fetch(`/api/store-visits/${visitId}/offers/${offer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchased: !offer.purchased }),
    })
    router.refresh()
  }

  async function deleteOffer(visitId: string, offerId: string) {
    await fetch(`/api/store-visits/${visitId}/offers/${offerId}`, { method: 'DELETE' })
    router.refresh()
  }

  async function addSelection(visitId: string, offerId: string) {
    setError('')
    const clientId = selClientId[offerId]
    if (!clientId) return
    const quantity = parseInt(selQty[offerId] || '1', 10) || 1
    const res = await fetch(`/api/store-visits/${visitId}/offers/${offerId}/selections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, quantity }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error && typeof data.error === 'string' ? data.error : 'No se pudo agregar la selección.')
      return
    }
    setSelClientId((prev) => ({ ...prev, [offerId]: '' }))
    setSelQty((prev) => ({ ...prev, [offerId]: '' }))
    router.refresh()
  }

  async function removeSelection(visitId: string, offerId: string, selectionId: string) {
    const res = await fetch(`/api/store-visits/${visitId}/offers/${offerId}/selections/${selectionId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error && typeof data.error === 'string' ? data.error : 'No se pudo quitar la selección.')
      return
    }
    router.refresh()
  }

  async function copyToWhatsApp(visit: StoreVisit) {
    const text = buildWhatsAppText(visit)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(visit.id)
      setTimeout(() => setCopiedId((id) => (id === visit.id ? null : id)), 2000)
    } catch {
      window.prompt('Copia este texto manualmente:', text)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-brand-black">Compras en tienda</h1>
        <button
          onClick={() => setCreatingVisit(true)}
          className="px-4 py-2 bg-brand-blue text-white rounded font-medium text-sm"
        >
          + Nueva visita
        </button>
      </div>

      <p className="text-sm text-brand-gray-dk mb-4">
        Proceso en 2 pasos por tienda: primero se arma y publica la oferta de productos encontrados
        (con foto y precio sugerido); después los clientes piden cuáles quieren — cada pedido se agrega
        al pedido normal del cliente y al mismo tiempo suma al carrito de lo que hay que comprar en esa tienda.
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

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

      <div className="space-y-4">
        {filtered.map((visit) => (
          <div key={visit.id} className="bg-white border border-brand-gray rounded-lg overflow-hidden">
            <div className="flex flex-wrap justify-between items-start gap-2 px-4 py-3 bg-brand-gray-lt">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-brand-black">{visit.store}</span>
                  <span className="text-sm text-brand-gray-dk">· {fmtDate(visit.visitDate)}</span>
                  <StatusBadge
                    label={VISIT_STATUS_LABELS[visit.status]}
                    colorClass={VISIT_STATUS_COLORS[visit.status]}
                  />
                </div>
                {visit.notes && <p className="text-xs text-brand-gray-dk mt-1">{visit.notes}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {visit.offers.length > 0 && (
                  <button onClick={() => copyToWhatsApp(visit)} className="text-sm text-brand-blue">
                    {copiedId === visit.id ? 'Copiado ✓' : 'Copiar para WhatsApp'}
                  </button>
                )}
                <button onClick={() => setEditingVisit(visit)} className="text-sm text-brand-blue">
                  Editar
                </button>
                {visit.status === 'DRAFT' && (
                  <button onClick={() => setVisitStatus(visit, 'PUBLISHED')} className="text-sm text-green-700">
                    Publicar
                  </button>
                )}
                {visit.status === 'PUBLISHED' && (
                  <button onClick={() => setVisitStatus(visit, 'DONE')} className="text-sm text-brand-gray-dk">
                    Cerrar visita
                  </button>
                )}
                {visit.status === 'DONE' && (
                  <button onClick={() => setVisitStatus(visit, 'PUBLISHED')} className="text-sm text-brand-gray-dk">
                    Reabrir
                  </button>
                )}
                <button
                  onClick={() => setOfferModal({ visitId: visit.id })}
                  className="text-sm text-brand-blue"
                >
                  + Agregar producto
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {visit.offers.length === 0 && (
                <p className="text-sm text-brand-gray-dk">
                  Todavía no hay productos ofrecidos de esta visita.
                </p>
              )}

              {visit.offers.map((offer) => (
                <div key={offer.id} className="border border-brand-gray rounded-lg p-3">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-brand-black">{offer.productName}</span>
                        <StatusBadge
                          label={offer.purchased ? 'Comprado' : 'Pendiente de comprar'}
                          colorClass={
                            offer.purchased ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'
                          }
                        />
                      </div>
                      <div className="text-sm text-brand-gray-dk mt-1">
                        Costo: {formatUSD(offer.costUsd)} ≈ {formatGTQ(offer.cost)} · Sugerido:{' '}
                        {formatGTQ(offer.suggestedPrice)} · Ofrecido: {formatGTQ(offer.finalPrice)}
                      </div>
                      {offer.photoUrl && (
                        <a
                          href={offer.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-blue underline"
                        >
                          Ver foto
                        </a>
                      )}
                      <div className="text-xs text-brand-gray-dk mt-1">
                        Pedido por clientes: {claimedQty(offer)} unidad{claimedQty(offer) === 1 ? '' : 'es'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => togglePurchased(visit.id, offer)} className="text-sm text-brand-blue">
                        {offer.purchased ? 'Marcar pendiente' : 'Marcar comprado'}
                      </button>
                      <button
                        onClick={() => setOfferModal({ visitId: visit.id, offer })}
                        className="text-sm text-brand-blue"
                      >
                        Editar
                      </button>
                      {offer.selections.length === 0 && (
                        <button
                          onClick={() => deleteOffer(visit.id, offer.id)}
                          className="text-sm text-red-600"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pl-3 border-l-2 border-brand-gray-lt">
                    <p className="text-xs font-medium text-brand-gray-dk mb-2">Clientes que lo pidieron</p>
                    {offer.selections.length === 0 && (
                      <p className="text-sm text-brand-gray-dk mb-2">Nadie ha pedido este producto todavía.</p>
                    )}
                    <ul className="space-y-1 mb-2">
                      {offer.selections.map((sel) => (
                        <li key={sel.id} className="flex items-center justify-between text-sm">
                          <span>
                            {sel.client.fullName} · {sel.quantity} unidad{sel.quantity === 1 ? '' : 'es'} ·{' '}
                            {formatGTQ(offer.finalPrice * sel.quantity)}
                          </span>
                          {!offer.purchased && (
                            <button
                              onClick={() => removeSelection(visit.id, offer.id, sel.id)}
                              className="text-red-600"
                            >
                              Quitar
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>

                    {visit.status === 'PUBLISHED' && !offer.purchased && (
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={selClientId[offer.id] ?? ''}
                          onChange={(e) => setSelClientId((prev) => ({ ...prev, [offer.id]: e.target.value }))}
                          className="px-2 py-1.5 border border-brand-gray rounded text-sm flex-1 min-w-[160px]"
                        >
                          <option value="">Cliente que lo pide...</option>
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
                          value={selQty[offer.id] ?? ''}
                          onChange={(e) => setSelQty((prev) => ({ ...prev, [offer.id]: e.target.value }))}
                          className="w-20 px-2 py-1.5 border border-brand-gray rounded text-sm"
                        />
                        <button
                          onClick={() => addSelection(visit.id, offer.id)}
                          className="px-3 py-1.5 bg-brand-blue text-white rounded text-sm"
                        >
                          Agregar
                        </button>
                      </div>
                    )}
                    {visit.status === 'DRAFT' && (
                      <p className="text-xs text-brand-gray-dk">
                        Publica la visita para empezar a tomar pedidos de clientes.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-brand-gray-dk py-6">No hay visitas registradas con este filtro.</p>
        )}
      </div>

      {creatingVisit && (
        <StoreVisitModal ciclos={ciclos} defaultCycleId={defaultCycleId} onClose={() => setCreatingVisit(false)} onSaved={refresh} />
      )}
      {editingVisit && (
        <StoreVisitModal visit={editingVisit} ciclos={ciclos} onClose={() => setEditingVisit(null)} onSaved={refresh} />
      )}
      {offerModal && (
        <OfferItemModal
          visitId={offerModal.visitId}
          offer={offerModal.offer}
          taxRate={taxRateFor(filtered.find((v) => v.id === offerModal.visitId)?.cycleId ?? cycleFilter)}
          onClose={() => setOfferModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
