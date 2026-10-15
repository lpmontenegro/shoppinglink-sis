import { prisma } from '@/lib/prisma'
import { getReceptionItems } from '@/lib/recepcion'
import RecepcionView from '@/components/recepcion/RecepcionView'

export default async function RecepcionPage() {
  const [ciclos, activeCycle] = await Promise.all([
    prisma.cycle.findMany({ orderBy: { openDate: 'desc' }, select: { id: true, code: true, status: true } }),
    prisma.cycle.findFirst({
      where: { status: { in: ['TRAVELING', 'PACKING', 'DELIVERING', 'ORDERS_CLOSED', 'OPEN'] } },
      orderBy: { openDate: 'desc' },
    }),
  ])
  const defaultCycleId = activeCycle?.id ?? ciclos[0]?.id
  const items = defaultCycleId ? await getReceptionItems(defaultCycleId) : []
  return <RecepcionView initialItems={items} ciclos={ciclos} selectedCycleId={defaultCycleId} />
}
