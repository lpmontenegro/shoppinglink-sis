import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cycleExpenseSchema } from '@/lib/validations/finanzas'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = cycleExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const expense = await prisma.cycleExpense.update({ where: { id: params.id }, data: parsed.data })
    return NextResponse.json(expense)
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    throw e
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.cycleExpense.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    throw e
  }
}
