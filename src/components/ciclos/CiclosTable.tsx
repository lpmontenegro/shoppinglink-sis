'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CicloModal from './CicloModal'
import StatusBadge from '@/components/StatusBadge'
import { CYCLE_STATUS_LABELS, CYCLE_STATUS_COLORS } from '@/lib/cycleStatus'

type Ciclo = {
  id: string
  code: string
  status: string
  openDate: string | Date
  closeDate: string | Date | null
  travelDepartDate: string | Date | null
  travelReturnDate: string | Date | null
  boxArrivalDate: string | Date | null
  usAddressId: string | null
  usAddress: { name: string } | null
  notes: string | null
}

function fmt(d: string | Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CiclosTable({ ciclos }: { ciclos: Ciclo[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Ciclo | null>(null)
  const [creating, setCreating] = useState(false)

  function closeAndRefresh() {
    setEditing(null)
    setCreating(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-brand-black">Ciclos</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-brand-blue text-white rounded font-medium text-sm"
        >
          + Nuevo ciclo
        </button>
      </div>

      <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-gray-lt text-left text-brand-gray-dk">
            <tr>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Apertura</th>
              <th className="px-4 py-2">Viaje</th>
              <th className="px-4 py-2">Dirección USA</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {ciclos.map((c) => (
              <tr key={c.id} className="border-t border-brand-gray">
                <td className="px-4 py-2 font-medium text-brand-black">{c.code}</td>
                <td className="px-4 py-2">
                  <StatusBadge
                    label={CYCLE_STATUS_LABELS[c.status] ?? c.status}
                    colorClass={CYCLE_STATUS_COLORS[c.status] ?? ''}
                  />
                </td>
                <td className="px-4 py-2">{fmt(c.openDate)}</td>
                <td className="px-4 py-2">
                  {c.travelDepartDate ? `${fmt(c.travelDepartDate)} – ${fmt(c.travelReturnDate)}` : '—'}
                </td>
                <td className="px-4 py-2">{c.usAddress?.name ?? '—'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setEditing(c)} className="text-brand-blue">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {ciclos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-brand-gray-dk">
                  No hay ciclos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && <CicloModal onClose={() => setCreating(false)} onSaved={closeAndRefresh} />}
      {editing && (
        <CicloModal ciclo={editing} onClose={() => setEditing(null)} onSaved={closeAndRefresh} />
      )}
    </div>
  )
}
