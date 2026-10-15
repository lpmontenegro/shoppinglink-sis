import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { itemAssignSchema } from '@/lib/validations/pedido'

// Pasa un producto a otro cliente (típicamente desde "Sin asignar"): lo mueve
// al pedido de ese cliente en el mismo ciclo, creando el pedido si no tiene.
// El pedido nuevo hereda el tipo de cambio del original, para no alterar el
// costo ya calculado. newClientName crea un cliente nuevo (solo nombre; el
// resto se completa en Clientes).
export async function POST(req: NextRequest, { params }: { params: { itemId: string } }) {
  const parsed = itemAssignSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const item = await prisma.orderItem.findUnique({ where: { id: params.itemId }, include: { order: true } })
  if (!item) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  let clientId = parsed.data.clientId
  if (!clientId && parsed.data.newClientName) {
    const name = parsed.data.newClientName
    const existing = await prisma.client.findFirst({
      where: { isSystem: false, fullName: { equals: name, mode: 'insensitive' } },
    })
    clientId =
      existing?.id ??
      (await prisma.client.create({ data: { fullName: name, phones: [], deliveryAddress: '', zone: '' } })).id
  }
  if (!clientId) return NextResponse.json({ error: 'Cliente requerido' }, { status: 400 })

  const client = await prisma.client.findUnique({ where: { id: clientId } })
  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const cycleId = item.order.cycleId
  const target =
    (await prisma.order.findFirst({ where: { clientId, cycleId }, orderBy: { orderDate: 'asc' } })) ??
    (await prisma.order.create({
      data: { clientId, cycleId, exchangeRate: item.order.exchangeRate, source: item.order.source },
    }))

  await prisma.orderItem.update({ where: { id: item.id }, data: { orderId: target.id } })

  // Si el pedido de origen quedó vacío (ej. el de "Sin asignar" no, pero un
  // pedido normal sí) se deja tal cual — no se borra nada automáticamente.
  return NextResponse.json({ ok: true, clientId, clientName: client.fullName, orderId: target.id })
}
