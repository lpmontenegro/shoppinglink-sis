import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pedidoSchema } from '@/lib/validations/pedido'
import { usdToGtq } from '@/lib/currency'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pedido = await prisma.order.findUnique({
    where: { id: params.id },
    include: { client: true, cycle: true, items: { include: { product: true } } },
  })
  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = pedidoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  if (!data.clientId) {
    return NextResponse.json({ error: 'Cliente requerido' }, { status: 400 })
  }

  const existing = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Al editar mantenemos el tipo de cambio original del pedido (no se
  // recalcula con el tipo de cambio actual), para no alterar costos ya
  // registrados. Si el costo en USD de un producto cambia, se recalcula con
  // esa misma tasa. Los productos que llegan sin id son nuevos; los que ya
  // no vienen en la lista se eliminan (se removieron en el formulario).
  const rate = Number(existing.exchangeRate)

  const incomingIds = new Set(data.items.filter((i) => i.id).map((i) => i.id as string))
  const toDeleteIds = existing.items.filter((i) => !incomingIds.has(i.id)).map((i) => i.id)

  function buildItemData(item: (typeof data.items)[number]) {
    return {
      productName: item.productName || null,
      photoUrl: item.photoUrl || null,
      productLink: item.purchaseType === 'ADVANCE' ? item.productLink || null : null,
      purchaseType: item.purchaseType,
      quantity: item.quantity,
      costUsd: item.purchaseType === 'ADVANCE' ? item.costUsd : null,
      cost:
        item.purchaseType === 'ADVANCE' && item.costUsd != null
          ? usdToGtq(item.costUsd, rate)
          : item.cost,
      salePrice: item.salePrice,
      notes: item.notes || null,
    }
  }

  try {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: params.id },
        data: {
          clientId: data.clientId,
          cycleId: data.cycleId,
          notes: data.notes || null,
        },
      }),
      ...toDeleteIds.map((id) => prisma.orderItem.delete({ where: { id } })),
      ...data.items.map((item) =>
        item.id
          ? prisma.orderItem.update({ where: { id: item.id }, data: buildItemData(item) })
          : prisma.orderItem.create({ data: { ...buildItemData(item), orderId: params.id } })
      ),
    ])
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    throw e
  }

  const pedido = await prisma.order.findUnique({
    where: { id: params.id },
    include: { client: true, cycle: true, items: true },
  })

  return NextResponse.json(pedido)
}
