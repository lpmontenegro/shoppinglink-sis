import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeVisitUpdateSchema } from '@/lib/validations/storeVisit'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const visit = await prisma.storeVisit.findUnique({
    where: { id: params.id },
    include: { offers: { include: { selections: { include: { client: true } } } } },
  })
  if (!visit) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(visit)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = storeVisitUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const visit = await prisma.storeVisit
    .update({
      where: { id: params.id },
      data: parsed.data,
      include: { offers: { include: { selections: { include: { client: true } } } } },
    })
    .catch(() => null)

  if (!visit) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(visit)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.storeVisit.delete({ where: { id: params.id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
