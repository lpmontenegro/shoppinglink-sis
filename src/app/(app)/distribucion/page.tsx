import { prisma } from '@/lib/prisma'
import { getDistributionItems } from '@/lib/distribucion'
import DistribucionView from '@/components/distribucion/DistribucionView'

export default async function DistribucionPage() {
  const [ciclos, activeCycle] = await Promise.all([
    prisma.cycle.findMany({
      orderBy: { openDate: 'desc' },
      select: { id: true, code: true, status: true },
    }),
    prisma.cycle.findFirst({
      where: { status: { in: ['ORDERS_CLOSED', 'TRAVELING', 'PACKING', 'DELIVERING', 'OPEN'] } },
      orderBy: { openDate: 'desc' },
    }),
  ])

  const defaultCycleId = activeCycle?.id ?? ciclos[0]?.id
  const plainItems = defaultCycleId ? await getDistributionItems(defaultCycleId, 'SUITCASE') : []

  return (
    <DistribucionView
      initialItems={plainItems}
      initialPackedIn="SUITCASE"
      ciclos={ciclos}
      selectedCycleId={defaultCycleId}
    />
  )
}
