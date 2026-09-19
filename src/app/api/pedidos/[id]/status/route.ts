import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pedidoStatusSchema } from '@/lib/validations/pedido'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = pedidoStatusSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (data.delivered === true) data.deliveryDate = new Date()

  const pedido = await prisma.order
    .update({
      where: { id: params.id },
      data,
      include: { client: true, cycle: true },
    })
    .catch(() => null)

  if (!pedido) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(pedido)
}
