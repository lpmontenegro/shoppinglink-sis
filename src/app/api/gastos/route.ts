import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cycleExpenseSchema } from '@/lib/validations/finanzas'

export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])

  const expenses = await prisma.cycleExpense.findMany({
    where: { cycleId },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(
    expenses.map((e) => ({
      id: e.id,
      cycleId: e.cycleId,
      type: e.type,
      date: e.date,
      amount: Number(e.amount),
      description: e.description,
    }))
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = cycleExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const expense = await prisma.cycleExpense.create({ data: parsed.data })
  return NextResponse.json(expense, { status: 201 })
}
