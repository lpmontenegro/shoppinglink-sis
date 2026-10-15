import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncClientStatementCache } from '@/lib/finanzas'
import { deliveryFeeSchema } from '@/lib/validations/finanzas'

// Cargo de delivery opcional por entrega (casi siempre va incluido = 0).
export async function PUT(req: NextRequest) {
  const parsed = deliveryFeeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { clientId, cycleId, part, amount } = parsed.data
  const field = part === 'SUITCASE' ? 'deliveryFeeSuitcase' : 'deliveryFeeBox'
  await prisma.clientStatement.upsert({
    where: { clientId_cycleId: { clientId, cycleId } },
    create: { clientId, cycleId, [field]: amount },
    update: { [field]: amount },
  })
  const result = await syncClientStatementCache(clientId, cycleId)
  return NextResponse.json(result)
}
