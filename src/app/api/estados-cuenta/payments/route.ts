import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { paymentSchema } from '@/lib/validations/finanzas'
import { computeClientBalance, syncClientStatementCache } from '@/lib/finanzas'

// Registra un pago de un cliente para un ciclo. El ClientStatement
// (contenedor del pago) se crea la primera vez que un cliente paga algo —
// no hace falta "abrir" un estado de cuenta a mano antes.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { clientId, cycleId, amount, paymentDate, notes } = parsed.data

  const statement = await prisma.clientStatement.upsert({
    where: { clientId_cycleId: { clientId, cycleId } },
    create: { clientId, cycleId },
    update: {},
  })

  await prisma.payment.create({
    data: { statementId: statement.id, amount, paymentDate, notes: notes || null },
  })

  await syncClientStatementCache(clientId, cycleId)
  const result = await computeClientBalance(clientId, cycleId)

  return NextResponse.json(result, { status: 201 })
}
