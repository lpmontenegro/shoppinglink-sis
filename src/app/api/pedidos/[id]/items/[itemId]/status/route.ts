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
  // Permite deshacer cualquier paso: si se desempaca se limpia el método, y
  // si se desmarca como entregado se limpia la fecha de entrega.
  if (data.delivered === true) {
    updateData.deliveryDate = new Date()
  } else if (data.delivered === false) {
    updateData.deliveryDate = null
  }
  if (data.packed === false) {
    updateData.packedIn = null
  }
  if (data.canceled === false) {
    updateData.canceledReason = null
    updateData.problem = false
  }
  if (data.received === true) {
    updateData.receivedAt = new Date()
  } else if (data.received === false) {
    updateData.receivedAt = null
  }
  // Problema al recibir: sale de la venta (cancelado con motivo). Quitar el
  // problema lo reactiva.
  if (data.problem === true) {
    updateData.canceled = true
    updateData.canceledReason = data.canceledReason || 'Problema al recibir'
  } else if (data.problem === false) {
    updateData.canceled = false
    updateData.canceledReason = null
  }

  const item = await prisma.orderItem.update({
    where: { id: params.itemId },
    data: updateData,
  })

  return NextResponse.json(item)
}
