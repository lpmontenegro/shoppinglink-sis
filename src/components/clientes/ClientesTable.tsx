'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ClienteModal from './ClienteModal'

type Cliente = {
  id: string
  fullName: string
  phones: string[]
  deliveryAddress: string
  zone: string
  notes: string | null
  active: boolean
}

export default function ClientesTable({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [creating, setCreating] = useState(false)

  function closeAndRefresh() {
    setEditing(null)
    setCreating(false)
    router.refresh()
  }

  async function toggleActive(cliente: Cliente) {
    await fetch(`/api/clientes/${cliente.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cliente, active: !cliente.active }),
    })
    router.refresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-brand-black">Clientes</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-brand-blue text-white rounded font-medium text-sm"
        >
          + Nuevo cliente
        </button>
      </div>

      <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-gray-lt text-left text-brand-gray-dk">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Teléfonos</th>
              <th className="px-4 py-2">Zona</th>
              <th className="px-4 py-2">Dirección</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t border-brand-gray">
                <td className="px-4 py-2 font-medium text-brand-black">{c.fullName}</td>
                <td className="px-4 py-2">{c.phones.join(', ')}</td>
                <td className="px-4 py-2">{c.zone || '—'}</td>
                <td className="px-4 py-2">{c.deliveryAddress || '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      c.active
                        ? 'text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs'
                        : 'text-brand-gray-dk bg-brand-gray-lt px-2 py-0.5 rounded text-xs'
                    }
                  >
                    {c.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button
                    onClick={() => setEditing(c)}
                    className="text-brand-blue"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActive(c)}
                    className="text-brand-gray-dk"
                  >
                    {c.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-brand-gray-dk">
                  No hay clientes todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {creating && <ClienteModal onClose={() => setCreating(false)} onSaved={closeAndRefresh} />}
      {editing && (
        <ClienteModal cliente={editing} onClose={() => setEditing(null)} onSaved={closeAndRefresh} />
      )}
    </div>
  )
}
