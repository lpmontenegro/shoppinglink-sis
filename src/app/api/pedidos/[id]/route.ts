import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pedidoSchema } from '@/lib/validations/pedido'
import { usdToGtq } from '@/lib/currency'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const pedido = await prisma.order.findUnique({
    where: { id: params.id },
    include: { client: true, cycle: true, product: true },
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

  const existing = await prisma.order.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Al editar mantenemos el tipo de cambio original del pedido (no se
  // recalcula con el tipo de cambio actual), para no alterar costos ya
  // registrados. Si el costo en USD cambia, se recalcula con esa misma tasa.
  const rate = Number(existing.exchangeRate)
  const cost =
    data.purchaseType === 'ADVANCE' && data.costUsd != null
      ? usdToGtq(data.costUsd, rate)
      : data.cost

  const pedido = await prisma.order
    .update({
      where: { id: params.id },
      data: {
        clientId: data.clientId,
        cycleId: data.cycleId,
        purchaseType: data.purchaseType,
        productLink: data.productLink || null,
        costUsd: data.purchaseType === 'ADVANCE' ? data.costUsd : null,
        cost,
        salePrice: data.salePrice,
        notes: data.notes || null,
      },
      include: { client: true, cycle: true },
    })
    .catch(() => null)

  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}
