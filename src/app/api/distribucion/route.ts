import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBalancesForClients } from '@/lib/finanzas'

// Solo productos ya empacados (maleta o caja) entran a distribución — el
// paso de empaque va antes. Se separa por packedIn porque la maleta llega
// con las administradoras al regresar del viaje y la caja llega después por
// courier, así que son dos momentos/listas de entrega distintos.
export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  const packedIn = req.nextUrl.searchParams.get('packedIn')
  if (!cycleId || (packedIn !== 'SUITCASE' && packedIn !== 'BOX')) return NextResponse.json([])

  const items = await prisma.orderItem.findMany({
    where: { canceled: false, packed: true, packedIn, order: { cycleId } },
    include: {
      order: {
        include: {
          client: { include: { pickupPlace: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const balances = await getBalancesForClients(
    items.map((i) => i.order.client.id),
    cycleId
  )

  const plainItems = items.map((i) => ({
    id: i.id,
    orderId: i.orderId,
    productName: i.productName,
    photoUrl: i.photoUrl,
    productLink: i.productLink,
    notes: i.notes,
    quantity: i.quantity,
    salePrice: Number(i.salePrice),
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

  return NextResponse.json(plainItems)
}
