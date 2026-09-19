import { prisma } from '@/lib/prisma'
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

  const items = defaultCycleId
    ? await prisma.orderItem.findMany({
        where: { canceled: false, order: { cycleId: defaultCycleId } },
        include: {
          order: {
            include: {
              client: { include: { pickupPlace: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    : []

  // Aplanamos a un shape simple: un item con los datos del cliente y del
  // pedido ya incluidos, listo para agrupar y renderizar en el cliente.
  const plainItems = items.map((i) => ({
    id: i.id,
    orderId: i.orderId,
    productLink: i.productLink,
    notes: i.notes,
    salePrice: Number(i.salePrice),
    confirmed: i.confirmed,
    packed: i.packed,
    packedIn: i.packedIn,
    delivered: i.delivered,
    client: {
      id: i.order.client.id,
      fullName: i.order.client.fullName,
      phones: i.order.client.phones,
      fulfillmentMethod: i.order.client.fulfillmentMethod,
      zone: i.order.client.zone,
      deliveryAddress: i.order.client.deliveryAddress,
      pickupPlace: i.order.client.pickupPlace ? { name: i.order.client.pickupPlace.name } : null,
    },
  }))

  return (
    <DistribucionView
      items={plainItems}
      ciclos={ciclos}
      selectedCycleId={defaultCycleId}
    />
  )
}
