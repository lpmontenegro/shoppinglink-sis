import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOrderSchema } from '@/lib/validations/storeOrder'
import { getExchangeRate } from '@/lib/settings'
import { usdToGtq } from '@/lib/currency'
import { suggestedSalePriceUsd, DEFAULT_TAX_RATE } from '@/lib/pricing'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId') ?? undefined

  const storeOrders = await prisma.storeOrder.findMany({
    where: cycleId ? { cycleId } : undefined,
    include: { claims: { include: { client: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(storeOrders)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = storeOrderSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const rate = await getExchangeRate()

  const cycle = await prisma.cycle.findUnique({ where: { id: data.cycleId } })
  if (!cycle) {
    return NextResponse.json({ error: 'Ciclo no encontrado' }, { status: 400 })
  }

  // El costo en Q y el precio sugerido se recalculan del lado del servidor
  // (mismo patrón que los pedidos): costo en USD * tipo de cambio vigente,
  // más impuesto de compra del ciclo + ganancia escalonada.
  const cost = usdToGtq(data.costUsd, rate)
  const suggestedPrice = usdToGtq(
    suggestedSalePriceUsd(data.costUsd, Number(cycle.taxRate) || DEFAULT_TAX_RATE),
    rate
  )

  const storeOrder = await prisma.storeOrder.create({
    data: {
      cycleId: data.cycleId,
      photoUrl: data.photoUrl || null,
      productName: data.productName,
      store: data.store,
      costUsd: data.costUsd,
      exchangeRate: rate,
      cost,
      suggestedPrice,
      finalPrice: data.finalPrice,
      storeLocationNote: data.storeLocationNote || null,
      purchased: data.purchased ?? false,
    },
    include: { claims: { include: { client: true } } },
  })

  return NextResponse.json(storeOrder, { status: 201 })
}
