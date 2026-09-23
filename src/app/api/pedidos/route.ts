import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pedidoSchema } from '@/lib/validations/pedido'
import { clienteQuickSchema } from '@/lib/validations/cliente'
import { getExchangeRate } from '@/lib/settings'
import { usdToGtq } from '@/lib/currency'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId') ?? undefined
  const clientId = req.nextUrl.searchParams.get('clientId') ?? undefined

  const where: any = {}
  if (cycleId) where.cycleId = cycleId
  if (clientId) where.clientId = clientId

  const pedidos = await prisma.order.findMany({
    where,
    include: { client: true, cycle: true, items: true },
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

  // El costo en quetzales de cada producto anticipado se recalcula del lado
  // del servidor (costo en USD * tipo de cambio vigente), en vez de confiar
  // en lo que haya calculado el navegador.
  const order = await prisma.order.create({
    data: {
      clientId,
      cycleId: data.cycleId,
      exchangeRate: rate,
      notes: data.notes || null,
      source: 'MANUAL',
      items: {
        create: data.items.map((item) => ({
          productName: item.productName || null,
          photoUrl: item.photoUrl || null,
          productLink: item.purchaseType === 'ADVANCE' ? item.productLink || null : null,
          purchaseType: item.purchaseType,
          costUsd: item.purchaseType === 'ADVANCE' ? item.costUsd : null,
          cost:
            item.purchaseType === 'ADVANCE' && item.costUsd != null
              ? usdToGtq(item.costUsd, rate)
              : item.cost,
          salePrice: item.salePrice,
          notes: item.notes || null,
        })),
      },
    },
    include: { client: true, cycle: true, items: true },
  })

  return NextResponse.json(order, { status: 201 })
}
