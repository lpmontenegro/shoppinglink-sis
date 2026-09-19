import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { pickupPlaceSchema } from '@/lib/validations/pickupPlace'

export async function GET() {
  const places = await prisma.pickupPlace.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(places)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = pickupPlaceSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const place = await prisma.pickupPlace.create({ data: parsed.data })
  return NextResponse.json(place, { status: 201 })
}
