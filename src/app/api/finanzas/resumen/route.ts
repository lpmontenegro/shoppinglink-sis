import { NextRequest, NextResponse } from 'next/server'
import { computeCycleSummary } from '@/lib/finanzas'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json(null)

  const summary = await computeCycleSummary(cycleId)
  return NextResponse.json(summary)
}
