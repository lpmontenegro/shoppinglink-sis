import { NextRequest, NextResponse } from 'next/server'
import { getReceptionItems } from '@/lib/recepcion'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])
  return NextResponse.json(await getReceptionItems(cycleId))
}
