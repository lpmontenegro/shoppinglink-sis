import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOrderClaimSchema } from '@/lib/validations/storeOrder'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = storeOrderClaimSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const storeOrder = await prisma.storeOrder.findUnique({ where: { id: params.id } })
  if (!storeOrder) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  try {
    const claim = await prisma.storeOrderClaim.create({
      data: {
        storeOrderId: params.id,
        clientId: parsed.data.clientId,
        quantity: parsed.data.quantity,
      },
      include: { client: true },
    })
    return NextResponse.json(claim, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Este cliente ya reclamó este producto' }, { status: 409 })
    }
    throw e
  }
}
