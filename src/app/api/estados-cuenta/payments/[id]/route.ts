import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncClientStatementCache } from '@/lib/finanzas'
import { paymentUpdateSchema } from '@/lib/validations/finanzas'

// Cambiar a qué entrega se aplica un pago (o corregir monto/fecha/nota).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = paymentUpdateSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const payment = await prisma.payment.findUnique({ where: { id: params.id }, include: { statement: true } })
  if (!payment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const d = parsed.data
  await prisma.payment.update({
    where: { id: params.id },
    data: {
      ...(d.part !== undefined ? { part: d.part } : {}),
      ...(d.amount !== undefined ? { amount: d.amount } : {}),
      ...(d.paymentDate !== undefined ? { paymentDate: d.paymentDate } : {}),
      ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
    },
  })
  const result = await syncClientStatementCache(payment.statement.clientId, payment.statement.cycleId)
  return NextResponse.json(result)
}

// Deshacer un pago (registrado por error, monto equivocado, etc.) — lo
// elimina y recalcula el saldo del cliente.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { statement: true },
  })
  if (!payment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.payment.delete({ where: { id: params.id } })
  const result = await syncClientStatementCache(payment.statement.clientId, payment.statement.cycleId)

  return NextResponse.json(result)
}
