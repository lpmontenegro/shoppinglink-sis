import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOfferItemSchema } from '@/lib/validations/storeVisit'
import { getExchangeRate } from '@/lib/settings'
import { usdToGtq } from '@/lib/currency'
import { suggestedSalePriceUsd, DEFAULT_TAX_RATE } from '@/lib/pricing'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = storeOfferItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const visit = await prisma.storeVisit.findUnique({ where: { id: params.id }, include: { cycle: true } })
  if (!visit) return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })

  const data = parsed.data
  const rate = await getExchangeRate()
  const cost = usdToGtq(data.costUsd, rate)
  const suggestedPrice = usdToGtq(
    suggestedSalePriceUsd(data.costUsd, Number(visit.cycle.taxRate) || DEFAULT_TAX_RATE),
    rate
  )

  const offer = await prisma.storeOfferItem.create({
    data: {
      storeVisitId: params.id,
      photoUrl: data.photoUrl || null,
      productName: data.productName,
      costUsd: data.costUsd,
      exchangeRate: rate,
      cost,
      suggestedPrice,
      finalPrice: data.finalPrice ?? suggestedPrice,
      notes: data.notes || null,
    },
    include: { selections: { include: { client: true } } },
  })

  return NextResponse.json(offer, { status: 201 })
}
