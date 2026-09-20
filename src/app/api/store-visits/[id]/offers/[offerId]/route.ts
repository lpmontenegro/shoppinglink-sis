import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOfferItemUpdateSchema } from '@/lib/validations/storeVisit'
import { usdToGtq } from '@/lib/currency'
import { suggestedSalePriceUsd, DEFAULT_TAX_RATE } from '@/lib/pricing'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; offerId: string } }
) {
  const body = await req.json().catch(() => null)
  const parsed = storeOfferItemUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.storeOfferItem.findUnique({
    where: { id: params.offerId },
    include: { storeVisit: { include: { cycle: true } }, selections: true },
  })
  if (!existing || existing.storeVisitId !== params.id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const data = parsed.data
  const updateData: Record<string, unknown> = {}

  if (data.productName !== undefined) updateData.productName = data.productName
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl || null
  if (data.notes !== undefined) updateData.notes = data.notes || null
  if (data.finalPrice !== undefined) updateData.finalPrice = data.finalPrice

  // Si cambia el costo en USD, se recalcula costo en Q y precio sugerido con
  // el tipo de cambio ya guardado (snapshot histórico, no se re-toma).
  if (data.costUsd !== undefined) {
    const rate = Number(existing.exchangeRate)
    updateData.costUsd = data.costUsd
    updateData.cost = usdToGtq(data.costUsd, rate)
    updateData.suggestedPrice = usdToGtq(
      suggestedSalePriceUsd(data.costUsd, Number(existing.storeVisit.cycle.taxRate) || DEFAULT_TAX_RATE),
      rate
    )
  }

  // Al marcar como comprado, se confirman automáticamente los OrderItem ya
  // generados por las selecciones de clientes (el producto ya está en mano).
  const justPurchased = data.purchased === true && !existing.purchased
  if (data.purchased !== undefined) updateData.purchased = data.purchased

  const offer = await prisma.$transaction(async (tx) => {
    const updated = await tx.storeOfferItem.update({
      where: { id: params.offerId },
      data: updateData,
      include: { selections: { include: { client: true } } },
    })

    if (justPurchased) {
      const orderItemIds = existing.selections
        .map((s) => s.orderItemId)
        .filter((id): id is string => !!id)
      if (orderItemIds.length > 0) {
        await tx.orderItem.updateMany({
          where: { id: { in: orderItemIds }, canceled: false },
          data: { confirmed: true },
        })
      }
    }

    return updated
  })

  return NextResponse.json(offer)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; offerId: string } }
) {
  const existing = await prisma.storeOfferItem.findUnique({ where: { id: params.offerId } })
  if (!existing || existing.storeVisitId !== params.id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  await prisma.storeOfferItem.delete({ where: { id: params.offerId } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
