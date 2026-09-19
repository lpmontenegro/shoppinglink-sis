import { prisma } from '@/lib/prisma'
import PedidosTable from '@/components/pedidos/PedidosTable'

export default async function PedidosPage() {
  const [pedidos, clientes, ciclos, openCycle] = await Promise.all([
    prisma.order.findMany({
      include: { client: true, cycle: true },
      orderBy: { orderDate: 'desc' },
    }),
    prisma.client.findMany({
      where: { active: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true },
    }),
    prisma.cycle.findMany({
      orderBy: { openDate: 'desc' },
      select: { id: true, code: true, status: true },
    }),
    prisma.cycle.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openDate: 'desc' },
    }),
  ])

  // Prisma's Decimal no se puede pasar tal cual de un Server Component a un
  // Client Component (RSC solo serializa tipos planos) — se convierte a
  // number antes de bajarlo como prop.
  const plainPedidos = pedidos.map((p) => ({
    ...p,
    costUsd: p.costUsd != null ? Number(p.costUsd) : null,
    exchangeRate: Number(p.exchangeRate),
    cost: Number(p.cost),
    salePrice: Number(p.salePrice),
  }))

  return (
    <PedidosTable
      pedidos={plainPedidos}
      clientes={clientes}
      ciclos={ciclos}
      defaultCycleId={openCycle?.id}
    />
  )
}
