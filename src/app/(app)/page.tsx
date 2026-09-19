import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const [activeClients, openCycle, pendingOrders] = await Promise.all([
    prisma.client.count({ where: { active: true } }),
    prisma.cycle.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openDate: 'desc' },
    }),
    prisma.order.count({
      where: { canceled: false, delivered: false, cycle: { status: 'OPEN' } },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black">Inicio</h1>
      <p className="mt-1 text-sm text-brand-gray-dk">
        Resumen rápido de la operación.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/clientes"
          className="block bg-white border border-brand-gray rounded-lg p-5 hover:border-brand-blue"
        >
          <p className="text-sm text-brand-gray-dk">Clientes activos</p>
          <p className="mt-1 text-3xl font-bold text-brand-black">{activeClients}</p>
        </Link>

        <Link
          href="/ciclos"
          className="block bg-white border border-brand-gray rounded-lg p-5 hover:border-brand-blue"
        >
          <p className="text-sm text-brand-gray-dk">Ciclo abierto</p>
          <p className="mt-1 text-3xl font-bold text-brand-black">
            {openCycle ? openCycle.code : '—'}
          </p>
          {!openCycle && (
            <p className="mt-1 text-xs text-brand-gray-dk">
              No hay ningún ciclo abierto ahora mismo.
            </p>
          )}
        </Link>

        <Link
          href="/pedidos"
          className="block bg-white border border-brand-gray rounded-lg p-5 hover:border-brand-blue"
        >
          <p className="text-sm text-brand-gray-dk">Pedidos pendientes (ciclo abierto)</p>
          <p className="mt-1 text-3xl font-bold text-brand-black">{pendingOrders}</p>
        </Link>
      </div>
    </div>
  )
}
