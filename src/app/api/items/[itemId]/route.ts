import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { itemQuickUpdateSchema } from '@/lib/validations/pedido'
import { usdToGtq } from '@/lib/currency'

// Cambio rápido a un producto (pantalla Pendientes): precio de venta, costo
// en USD (se recalcula el costo en Q con el tipo de cambio del pedido),
// nombre o cantidad.
export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  const parsed = itemQuickUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const item = await prisma.orderItem.findUnique({ where: { id: params.itemId }, include: { order: true } })
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const d = parsed.data
  const data: Record<string, unknown> = {}
  if (d.salePrice !== undefined) data.salePrice = d.salePrice
  if (d.productName !== undefined) data.productName = d.productName
  if (d.quantity !== undefined) data.quantity = d.quantity
  if (d.costUsd !== undefined) {
    data.costUsd = d.costUsd
    data.cost = d.costUsd == null ? null : usdToGtq(d.costUsd, Number(item.order.exchangeRate))
  }
  const updated = await prisma.orderItem.update({ where: { id: params.itemId }, data })
  return NextResponse.json({
    id: updated.id,
    salePrice: updated.salePrice == null ? null : Number(updated.salePrice),
    costUsd: updated.costUsd == null ? null : Number(updated.costUsd),
  })
}
