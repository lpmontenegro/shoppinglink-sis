import { prisma } from '@/lib/prisma'
import StoreOrdersTable from '@/components/tienda/StoreOrdersTable'

export default async function TiendaPage() {
  const [storeOrders, clientes, ciclos, activeCycle] = await Promise.all([
    prisma.storeOrder.findMany({
      include: { claims: { include: { client: true } } },
      orderBy: { createdAt: 'desc' },
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
      where: { status: { in: ['OPEN', 'ORDERS_CLOSED', 'TRAVELING', 'PACKING', 'DELIVERING'] } },
      orderBy: { openDate: 'desc' },
    }),
  ])

  // Prisma's Decimal no se puede pasar tal cual de un Server Component a un
  // Client Component — se convierte a number antes de bajarlo como prop.
  const plainStoreOrders = storeOrders.map((o) => ({
    ...o,
    costUsd: o.costUsd != null ? Number(o.costUsd) : null,
    exchangeRate: Number(o.exchangeRate),
    cost: Number(o.cost),
    suggestedPrice: Number(o.suggestedPrice),
    finalPrice: Number(o.finalPrice),
  }))
  const plainCiclos = ciclos.map((c) => ({ ...c, taxRate: Number(c.taxRate) }))

  return (
    <StoreOrdersTable
      storeOrders={plainStoreOrders}
      clientes={clientes}
      ciclos={plainCiclos}
      defaultCycleId={activeCycle?.id}
    />
  )
}
