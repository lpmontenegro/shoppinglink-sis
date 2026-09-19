import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { usAddressSchema } from '@/lib/validations/usAddress'

export async function GET() {
  const addresses = await prisma.usAddress.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(addresses)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = usAddressSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const address = await prisma.usAddress.create({ data: parsed.data })
  return NextResponse.json(address, { status: 201 })
}
