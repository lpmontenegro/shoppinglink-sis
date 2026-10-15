import { prisma } from '@/lib/prisma'
import { getPendingItems } from '@/lib/pendientes'
import PendientesView from '@/components/pendientes/PendientesView'

export default async function PendientesPage() {
  const [ciclos, activeCycle] = await Promise.all([
    prisma.cycle.findMany({ orderBy: { openDate: 'desc' }, select: { id: true, code: true, status: true } }),
    prisma.cycle.findFirst({
      where: { status: { in: ['TRAVELING', 'PACKING', 'DELIVERING', 'ORDERS_CLOSED', 'OPEN'] } },
      orderBy: { openDate: 'desc' },
    }),
  ])
  const defaultCycleId = activeCycle?.id ?? ciclos[0]?.id
  const items = defaultCycleId ? await getPendingItems(defaultCycleId) : []
  return <PendientesView initialItems={items} ciclos={ciclos} selectedCycleId={defaultCycleId} />
}
