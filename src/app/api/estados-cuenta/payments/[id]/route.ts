import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeClientBalance, syncClientStatementCache } from '@/lib/finanzas'

// Deshacer un pago (registrado por error, monto equivocado, etc.) — lo
// elimina y recalcula el saldo del cliente.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { statement: true },
  })
  if (!payment) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.payment.delete({ where: { id: params.id } })
  await syncClientStatementCache(payment.statement.clientId, payment.statement.cycleId)
  const result = await computeClientBalance(payment.statement.clientId, payment.statement.cycleId)

  return NextResponse.json(result)
}
