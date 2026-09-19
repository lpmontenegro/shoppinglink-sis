import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clienteSchema } from '@/lib/validations/cliente'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({ where: { id: params.id } })
  if (!client) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = clienteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const client = await prisma.client
    .update({ where: { id: params.id }, data: parsed.data })
    .catch(() => null)

  if (!client) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(client)
}
