import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orderItemStatusSchema } from '@/lib/validations/pedido'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const body = await req.json().catch(() => null)
  const parsed = orderItemStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existingItem = await prisma.orderItem.findUnique({ where: { id: params.itemId } })
  if (!existingItem || existingItem.orderId !== params.id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const data = parsed.data
  const updateData: Record<string, unknown> = { ...data }
  if (data.delivered) {
    updateData.deliveryDate = new Date()
  }

  const item = await prisma.orderItem.update({
    where: { id: params.itemId },
    data: updateData,
  })

  return NextResponse.json(item)
}
