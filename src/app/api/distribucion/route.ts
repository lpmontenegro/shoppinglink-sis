import { NextRequest, NextResponse } from 'next/server'
import { getDistributionItems } from '@/lib/distribucion'

// Lista de entrega de un ciclo, separada por maleta (entrega 1) o caja
// (entrega 2) — llegan a Guatemala en momentos distintos.
export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  const packedIn = req.nextUrl.searchParams.get('packedIn')
  if (!cycleId || (packedIn !== 'SUITCASE' && packedIn !== 'BOX')) return NextResponse.json([])
  return NextResponse.json(await getDistributionItems(cycleId, packedIn))
}
