import { prisma } from '@/lib/prisma'
import PedidosTable from '@/components/pedidos/PedidosTable'

export default async function PedidosPage() {
  const [pedidos, clientes, ciclos, openCycle] = await Promise.all([
    prisma.order.findMany({
      include: { client: true, cycle: true, items: true },
      orderBy: { orderDate: 'desc' },
    }),
    prisma.client.findMany({
      where: { active: true },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true },
    }),
    prisma.cycle.findMany({
      orderBy: { openDate: 'desc' },
      select: { id: true, code: true, status: true, taxRate: true },
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
    exchangeRate: Number(p.exchangeRate),
    items: p.items.map((i) => ({
      ...i,
      costUsd: i.costUsd != null ? Number(i.costUsd) : null,
      cost: Number(i.cost),
      salePrice: Number(i.salePrice),
    })),
  }))
  const plainCiclos = ciclos.map((c) => ({ ...c, taxRate: Number(c.taxRate) }))

  return (
    <PedidosTable
      pedidos={plainPedidos}
      clientes={clientes}
      ciclos={plainCiclos}
      defaultCycleId={openCycle?.id}
    />
  )
}
