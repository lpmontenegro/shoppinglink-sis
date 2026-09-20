import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOfferSelectionUpdateSchema } from '@/lib/validations/storeVisit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; offerId: string; selectionId: string } }
) {
  const body = await req.json().catch(() => null)
  const parsed = storeOfferSelectionUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.storeOfferSelection.findUnique({
    where: { id: params.selectionId },
    include: { offerItem: true },
  })
  if (!existing || existing.offerItemId !== params.offerId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  if (existing.offerItem.purchased) {
    return NextResponse.json(
      { error: 'Ya se compró este producto — ajusta la cantidad desde Pedidos en vez de aquí' },
      { status: 400 }
    )
  }

  const { quantity } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    const selection = await tx.storeOfferSelection.update({
      where: { id: params.selectionId },
      data: { quantity },
      include: { client: true },
    })
    if (existing.orderItemId) {
      await tx.orderItem.update({
        where: { id: existing.orderItemId },
        data: { salePrice: Number(existing.offerItem.finalPrice) * quantity },
      })
    }
    return selection
  })

  return NextResponse.json(result)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; offerId: string; selectionId: string } }
) {
  const existing = await prisma.storeOfferSelection.findUnique({
    where: { id: params.selectionId },
    include: { offerItem: true },
  })
  if (!existing || existing.offerItemId !== params.offerId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  if (existing.offerItem.purchased) {
    return NextResponse.json(
      { error: 'Ya se compró este producto — cancela el producto desde Pedidos en vez de quitarlo aquí' },
      { status: 400 }
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.storeOfferSelection.delete({ where: { id: params.selectionId } })
    if (existing.orderItemId) {
      const orderItem = await tx.orderItem.findUnique({ where: { id: existing.orderItemId } })
      if (orderItem) {
        await tx.orderItem.delete({ where: { id: existing.orderItemId } })
        const remaining = await tx.orderItem.count({ where: { orderId: orderItem.orderId } })
        if (remaining === 0) {
          await tx.order.delete({ where: { id: orderItem.orderId } })
        }
      }
    }
  })

  return NextResponse.json({ ok: true })
}
