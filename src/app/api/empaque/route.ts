import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])

  const items = await prisma.orderItem.findMany({
    where: { canceled: false, confirmed: true, order: { cycleId } },
    include: {
      order: { include: { client: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const plainItems = items.map((i) => ({
    id: i.id,
    orderId: i.orderId,
    productLink: i.productLink,
    notes: i.notes,
    purchaseType: i.purchaseType,
    packed: i.packed,
    packedIn: i.packedIn,
    delivered: i.delivered,
    clientName: i.order.client.fullName,
  }))

  return NextResponse.json(plainItems)
}
