import { prisma } from './prisma'

// Todos los productos de un ciclo para la recepción en Guatemala: lo que
// llegó en la maleta, lo que viene en la caja, y lo que tuvo problema
// (cancelado por problema, para tener la lista de devoluciones). Incluye los
// productos "Sin asignar" — también llegan físicamente.
export async function getReceptionItems(cycleId: string) {
  const items = await prisma.orderItem.findMany({
    where: { order: { cycleId }, OR: [{ canceled: false }, { problem: true }] },
    include: { order: { include: { client: { select: { id: true, fullName: true, isSystem: true } } } } },
    orderBy: [{ createdAt: 'asc' }],
  })
  return items.map((i) => ({
    id: i.id,
    orderId: i.orderId,
    productName: i.productName,
    photoUrl: i.photoUrl,
    notes: i.notes,
    store: i.store,
    purchaseType: i.purchaseType,
    quantity: i.quantity,
    salePrice: i.salePrice == null ? null : Number(i.salePrice),
    packed: i.packed,
    packedIn: i.packedIn,
    received: i.received,
    problem: i.problem,
    canceledReason: i.canceledReason,
    delivered: i.delivered,
    clientId: i.order.client.id,
    clientName: i.order.client.fullName,
    unassigned: i.order.client.isSystem,
  }))
}
