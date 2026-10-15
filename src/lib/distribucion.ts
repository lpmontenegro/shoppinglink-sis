import { prisma } from './prisma'
import { getPartBalancesForClients, type Part } from './finanzas'

// Productos de una entrega (maleta o caja) para la lista de distribución.
// Entran todos los productos asignados a esa entrega; los que todavía no se
// han recibido en Guatemala salen marcados (no se pueden entregar hasta que
// lleguen). El saldo que se muestra por cliente es el de ESA entrega.
export async function getDistributionItems(cycleId: string, packedIn: Part) {
  const items = await prisma.orderItem.findMany({
    where: { canceled: false, packed: true, packedIn, order: { cycleId, client: { isSystem: false } } },
    include: { order: { include: { client: { include: { pickupPlace: true } } } } },
    orderBy: { createdAt: 'asc' },
  })

  const balances = await getPartBalancesForClients(
    items.map((i) => i.order.client.id),
    cycleId,
    packedIn
  )

  return items.map((i) => ({
    id: i.id,
    orderId: i.orderId,
    productName: i.productName,
    photoUrl: i.photoUrl,
    productLink: i.productLink,
    notes: i.notes,
    quantity: i.quantity,
    salePrice: i.salePrice == null ? null : Number(i.salePrice),
    received: i.received,
    delivered: i.delivered,
    client: {
      id: i.order.client.id,
      fullName: i.order.client.fullName,
      phones: i.order.client.phones,
      fulfillmentMethod: i.order.client.fulfillmentMethod,
      zone: i.order.client.zone,
      deliveryAddress: i.order.client.deliveryAddress,
      pickupPlace: i.order.client.pickupPlace ? { name: i.order.client.pickupPlace.name } : null,
      balance: balances[i.order.client.id] ?? 0,
    },
  }))
}
