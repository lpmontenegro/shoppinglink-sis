import { prisma } from '@/lib/prisma'
import EmpaqueView from '@/components/empaque/EmpaqueView'

export default async function EmpaquePage() {
  const [ciclos, activeCycle] = await Promise.all([
    prisma.cycle.findMany({
      orderBy: { openDate: 'desc' },
      select: { id: true, code: true, status: true },
    }),
    prisma.cycle.findFirst({
      where: { status: { in: ['ORDERS_CLOSED', 'TRAVELING', 'PACKING', 'OPEN'] } },
      orderBy: { openDate: 'desc' },
    }),
  ])

  const defaultCycleId = activeCycle?.id ?? ciclos[0]?.id

  const items = defaultCycleId
    ? await prisma.orderItem.findMany({
        where: {
          canceled: false,
          OR: [{ confirmed: true }, { packed: true }],
          order: { cycleId: defaultCycleId },
        },
        include: { order: { include: { client: { select: { fullName: true } } } } },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const plainItems = items.map((i) => ({
    id: i.id,
    orderId: i.orderId,
    productName: i.productName,
    photoUrl: i.photoUrl,
    productLink: i.productLink,
    notes: i.notes,
    purchaseType: i.purchaseType,
    confirmed: i.confirmed,
    packed: i.packed,
    packedIn: i.packedIn,
    delivered: i.delivered,
    clientName: i.order.client.fullName,
  }))

  return (
    <EmpaqueView items={plainItems} ciclos={ciclos} selectedCycleId={defaultCycleId} />
  )
}
