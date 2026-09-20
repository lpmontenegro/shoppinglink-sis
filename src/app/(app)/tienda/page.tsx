import { prisma } from '@/lib/prisma'
import TiendaView from '@/components/tienda/TiendaView'

export default async function TiendaPage() {
  const [visits, clientes, ciclos, activeCycle] = await Promise.all([
    prisma.storeVisit.findMany({
      include: {
        offers: {
          include: { selections: { include: { client: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { visitDate: 'desc' },
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
  const plainVisits = visits.map((v) => ({
    ...v,
    offers: v.offers.map((o) => ({
      ...o,
      costUsd: Number(o.costUsd),
      exchangeRate: Number(o.exchangeRate),
      cost: Number(o.cost),
      suggestedPrice: Number(o.suggestedPrice),
      finalPrice: Number(o.finalPrice),
    })),
  }))
  const plainCiclos = ciclos.map((c) => ({ ...c, taxRate: Number(c.taxRate) }))

  return (
    <TiendaView
      visits={plainVisits}
      clientes={clientes}
      ciclos={plainCiclos}
      defaultCycleId={activeCycle?.id}
    />
  )
}
