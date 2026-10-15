import { prisma } from './prisma'
import { suggestedPriceGtq } from './pricing'

// Lo que falta completar en un ciclo: productos sin cliente (en el cliente
// interno "Sin asignar") y productos con precio pendiente. El precio
// sugerido es solo referencia — nunca se guarda solo.
export async function getPendingItems(cycleId: string) {
  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId }, select: { taxRate: true } })
  const taxRate = cycle ? Number(cycle.taxRate) : undefined
  const items = await prisma.orderItem.findMany({
    where: {
      canceled: false,
      order: { cycleId },
      OR: [{ salePrice: null }, { order: { client: { isSystem: true } } }],
    },
    include: { order: { select: { exchangeRate: true, client: { select: { id: true, fullName: true, isSystem: true } } } } },
    orderBy: { createdAt: 'asc' },
  })
  return items.map((i) => {
    const costUsd = i.costUsd == null ? null : Number(i.costUsd)
    return {
      id: i.id,
      orderId: i.orderId,
      productName: i.productName,
      photoUrl: i.photoUrl,
      notes: i.notes,
      store: i.store,
      purchaseType: i.purchaseType,
      quantity: i.quantity,
      costUsd,
      salePrice: i.salePrice == null ? null : Number(i.salePrice),
      suggestedPrice: suggestedPriceGtq(i.purchaseType, costUsd, Number(i.order.exchangeRate), taxRate),
      importRef: i.importRef,
      clientId: i.order.client.id,
      clientName: i.order.client.fullName,
      unassigned: i.order.client.isSystem,
      packedIn: i.packed ? i.packedIn : null,
    }
  })
}
