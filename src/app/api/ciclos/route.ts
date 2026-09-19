import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cicloSchema } from '@/lib/validations/ciclo'

export async function GET() {
  const ciclos = await prisma.cycle.findMany({
    orderBy: { openDate: 'desc' },
  })
  return NextResponse.json(ciclos)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = cicloSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const ciclo = await prisma.cycle.create({ data: parsed.data })
    return NextResponse.json(ciclo, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un ciclo con ese código' }, { status: 409 })
    }
    throw e
  }
}
