import { prisma } from '@/lib/prisma'
import FinanzasView from '@/components/finanzas/FinanzasView'

export default async function FinanzasPage() {
  const [ciclos, activeCycle] = await Promise.all([
    prisma.cycle.findMany({
      orderBy: { openDate: 'desc' },
      select: { id: true, code: true, status: true },
    }),
    prisma.cycle.findFirst({
      where: { status: { in: ['OPEN', 'ORDERS_CLOSED', 'TRAVELING', 'PACKING', 'DELIVERING'] } },
      orderBy: { openDate: 'desc' },
    }),
  ])

  const defaultCycleId = activeCycle?.id ?? ciclos[0]?.id

  return <FinanzasView ciclos={ciclos} selectedCycleId={defaultCycleId} />
}
