'use client'

import { useEffect, useMemo, useState } from 'react'
import PhotoThumb from '@/components/PhotoThumb'

type Item = {
  id: string
  orderId: string
  productName: string | null
  photoUrl: string | null
  productLink: string | null
  notes: string | null
  purchaseType: string
  quantity: number
  confirmed: boolean
  packed: boolean
  packedIn: string | null
  delivered: boolean
  clientName: string
}

function ProductCell({ item }: { item: Item }) {
  return (
    <div className="flex items-center gap-2">
      {item.photoUrl && <PhotoThumb src={item.photoUrl} size="w-8 h-8" />}
      <span className="truncate">
        {item.productName || item.productLink || item.notes || '—'}
        {item.quantity > 1 && <span className="ml-1 text-xs font-medium text-brand-blue">×{item.quantity}</span>}
      </span>
    </div>
  )
}

type CicloOption = { id: string; code: string; status: string }

export default function EmpaqueView({
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
  const [loading, setLoading] = useState(false)

  async function loadItems(id: string) {
    if (!id) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/empaque?cycleId=${id}`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId])

  async function setPacked(orderId: string, itemId: string, packedIn: 'SUITCASE' | 'BOX' | null) {
    await fetch(`/api/pedidos/${orderId}/items/${itemId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packed: packedIn !== null, packedIn }),
    })
    loadItems(cycleId)
  }

  const pending = useMemo(() => items.filter((i) => !i.packed), [items])
  const packed = useMemo(() => items.filter((i) => i.packed), [items])
  const suitcaseCount = useMemo(() => packed.filter((i) => i.packedIn === 'SUITCASE').length, [packed])
  const boxCount = useMemo(() => packed.filter((i) => i.packedIn === 'BOX').length, [packed])

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-1">Empaque del ciclo</h1>
      <p className="text-sm text-brand-gray-dk mb-4">
        Solo se listan productos ya confirmados (listos para empacar), del ciclo seleccionado.
      </p>

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
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white border border-brand-gray rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-brand-black">{pending.length}</p>
          <p className="text-xs text-brand-gray-dk">Pendientes de empacar</p>
        </div>
        <div className="bg-white border border-brand-gray rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-brand-black">{suitcaseCount}</p>
          <p className="text-xs text-brand-gray-dk">En maleta</p>
        </div>
        <div className="bg-white border border-brand-gray rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-brand-black">{boxCount}</p>
          <p className="text-xs text-brand-gray-dk">En caja</p>
        </div>
      </div>

      {loading && <p className="text-sm text-brand-gray-dk">Cargando...</p>}

      {!loading && (
        <>
          <h2 className="font-bold text-brand-black mb-2">Pendientes de empacar</h2>
          <div className="bg-white border border-brand-gray rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-brand-gray-lt text-left text-brand-gray-dk">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item) => (
                  <tr key={item.id} className="border-t border-brand-gray">
                    <td className="px-4 py-2 max-w-[220px]">
                      <ProductCell item={item} />
                    </td>
                    <td className="px-4 py-2">{item.clientName}</td>
                    <td className="px-4 py-2">{item.purchaseType === 'ADVANCE' ? 'Anticipada' : 'Courier'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setPacked(item.orderId, item.id, 'SUITCASE')}
                        className="text-brand-blue"
                      >
                        Maleta
                      </button>
                      <button onClick={() => setPacked(item.orderId, item.id, 'BOX')} className="text-brand-blue">
                        Caja
                      </button>
                    </td>
                  </tr>
                ))}
                {pending.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-brand-gray-dk">
                      No hay productos pendientes de empacar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="font-bold text-brand-black mb-2">Ya empacados</h2>
          <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-gray-lt text-left text-brand-gray-dk">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Empacado en</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {packed.map((item) => (
                  <tr key={item.id} className="border-t border-brand-gray">
                    <td className="px-4 py-2 max-w-[220px]">
                      <ProductCell item={item} />
                    </td>
                    <td className="px-4 py-2">{item.clientName}</td>
                    <td className="px-4 py-2">{item.packedIn === 'SUITCASE' ? 'Maleta' : 'Caja'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setPacked(item.orderId, item.id, null)} className="text-brand-gray-dk">
                        Deshacer
                      </button>
                    </td>
                  </tr>
                ))}
                {packed.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-brand-gray-dk">
                      Todavía no se ha empacado nada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
