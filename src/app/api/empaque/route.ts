import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])

  // OR confirmed/packed (no solo confirmed): así, si algún producto quedó
  // empacado sin confirmar por un bug anterior, de todos modos aparece aquí
  // en vez de desaparecer silenciosamente.
  const items = await prisma.orderItem.findMany({
    where: {
      canceled: false,
      OR: [{ confirmed: true }, { packed: true }],
      order: { cycleId },
    },
    include: {
      order: { include: { client: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  })

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

  return NextResponse.json(plainItems)
}
