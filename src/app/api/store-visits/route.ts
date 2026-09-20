import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeVisitSchema } from '@/lib/validations/storeVisit'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId') ?? undefined

  const visits = await prisma.storeVisit.findMany({
    where: cycleId ? { cycleId } : undefined,
    include: {
      offers: {
        include: { selections: { include: { client: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { visitDate: 'desc' },
  })

  return NextResponse.json(visits)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = storeVisitSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const visit = await prisma.storeVisit.create({
    data: {
      cycleId: data.cycleId,
      store: data.store,
      visitDate: data.visitDate ?? new Date(),
      notes: data.notes || null,
    },
    include: { offers: { include: { selections: { include: { client: true } } } } },
  })

  return NextResponse.json(visit, { status: 201 })
}
