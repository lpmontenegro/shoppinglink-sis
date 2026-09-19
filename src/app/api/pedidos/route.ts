import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pedidoSchema } from '@/lib/validations/pedido'
import { clienteQuickSchema } from '@/lib/validations/cliente'
import { getExchangeRate } from '@/lib/settings'
import { usdToGtq } from '@/lib/currency'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId') ?? undefined
  const clientId = req.nextUrl.searchParams.get('clientId') ?? undefined
  const status = req.nextUrl.searchParams.get('status') ?? undefined

  const where: any = {}
  if (cycleId) where.cycleId = cycleId
  if (clientId) where.clientId = clientId
  if (status === 'pending') {
    where.delivered = false
    where.canceled = false
  } else if (status === 'delivered') {
    where.delivered = true
  } else if (status === 'canceled') {
    where.canceled = true
  }

  const pedidos = await prisma.order.findMany({
    where,
    include: { client: true, cycle: true },
    orderBy: { orderDate: 'desc' },
  })

  return NextResponse.json(pedidos)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = pedidoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const rate = await getExchangeRate()

  let clientId = data.clientId

  if (!clientId && data.newClient) {
    const quick = clienteQuickSchema.safeParse(data.newClient)
    if (!quick.success) {
      return NextResponse.json({ error: quick.error.flatten() }, { status: 400 })
    }
    const newClient = await prisma.client.create({
      data: {
        fullName: quick.data.fullName,
        phones: [quick.data.phone],
        deliveryAddress: '',
        zone: '',
        active: true,
      },
    })
    clientId = newClient.id
  }

  if (!clientId) {
    return NextResponse.json({ error: 'Cliente requerido' }, { status: 400 })
  }

  // El costo en quetzales se recalcula del lado del servidor para las compras
  // anticipadas (costo en USD * tipo de cambio vigente), en vez de confiar en
  // lo que haya calculado el navegador.
  const cost =
    data.purchaseType === 'ADVANCE' && data.costUsd != null
      ? usdToGtq(data.costUsd, rate)
      : data.cost

  const order = await prisma.order.create({
    data: {
      clientId,
      cycleId: data.cycleId,
      purchaseType: data.purchaseType,
      productLink: data.productLink || null,
      costUsd: data.purchaseType === 'ADVANCE' ? data.costUsd : null,
      exchangeRate: rate,
      cost,
      salePrice: data.salePrice,
      notes: data.notes || null,
      source: 'MANUAL',
    },
    include: { client: true, cycle: true },
  })

  return NextResponse.json(order, { status: 201 })
}
