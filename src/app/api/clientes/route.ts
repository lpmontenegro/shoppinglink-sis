import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clienteSchema } from '@/lib/validations/cliente'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()

  const clients = await prisma.client.findMany({
    where: q
      ? { fullName: { contains: q, mode: 'insensitive' } }
      : undefined,
    orderBy: { fullName: 'asc' },
  })

  return NextResponse.json(clients)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = clienteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const client = await prisma.client.create({ data: parsed.data })
  return NextResponse.json(client, { status: 201 })
}
