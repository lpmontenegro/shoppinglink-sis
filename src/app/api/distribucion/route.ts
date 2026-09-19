import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])

  const items = await prisma.orderItem.findMany({
    where: { canceled: false, order: { cycleId } },
    include: {
      order: {
        include: {
          client: { include: { pickupPlace: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

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

  return NextResponse.json(plainItems)
}
