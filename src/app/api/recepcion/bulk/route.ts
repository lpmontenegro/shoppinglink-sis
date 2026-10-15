import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Al terminar de desempacar las maletas: todo lo que no se marcó como
// recibido en maleta (ni con problema) se da por "viene en la caja".
const schema = z.object({ cycleId: z.string().min(1), action: z.literal('remainingToBox') })

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const result = await prisma.orderItem.updateMany({
    where: { canceled: false, packed: false, order: { cycleId: parsed.data.cycleId } },
    data: { packed: true, packedIn: 'BOX', received: false, receivedAt: null },
  })
  return NextResponse.json({ updated: result.count })
}
