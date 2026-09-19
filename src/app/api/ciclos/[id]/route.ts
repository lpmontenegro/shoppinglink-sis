import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cicloSchema } from '@/lib/validations/ciclo'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ciclo = await prisma.cycle.findUnique({ where: { id: params.id } })
  if (!ciclo) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(ciclo)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = cicloSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const ciclo = await prisma.cycle.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json(ciclo)
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un ciclo con ese código' }, { status: 409 })
    }
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    throw e
  }
}
