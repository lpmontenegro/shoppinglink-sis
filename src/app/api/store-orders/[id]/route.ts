import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOrderSchema } from '@/lib/validations/storeOrder'
import { usdToGtq } from '@/lib/currency'
import { suggestedSalePriceUsd, DEFAULT_TAX_RATE } from '@/lib/pricing'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const storeOrder = await prisma.storeOrder.findUnique({
    where: { id: params.id },
    include: { claims: { include: { client: true } } },
  })
  if (!storeOrder) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(storeOrder)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  // Update parcial: todos los campos son opcionales (ej. el botón "Marcar
  // comprado" en la tabla solo envía { purchased }).
  const parsed = storeOrderSchema.partial().safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.storeOrder.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const data = parsed.data
  const updateData: Record<string, unknown> = {}

  if (data.productName !== undefined) updateData.productName = data.productName
  if (data.store !== undefined) updateData.store = data.store
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl || null
  if (data.storeLocationNote !== undefined) updateData.storeLocationNote = data.storeLocationNote || null
  if (data.purchased !== undefined) updateData.purchased = data.purchased
  if (data.finalPrice !== undefined) updateData.finalPrice = data.finalPrice

  // Si cambia el costo en USD, se recalcula costo en Q y precio sugerido con
  // el tipo de cambio ya guardado en el registro (no se re-snapshotea).
  if (data.costUsd !== undefined) {
    const cycle = await prisma.cycle.findUnique({ where: { id: existing.cycleId } })
    const rate = Number(existing.exchangeRate)
    updateData.costUsd = data.costUsd
    updateData.cost = usdToGtq(data.costUsd, rate)
    updateData.suggestedPrice = usdToGtq(
      suggestedSalePriceUsd(data.costUsd, cycle ? Number(cycle.taxRate) : DEFAULT_TAX_RATE),
      rate
    )
  }

  const storeOrder = await prisma.storeOrder
    .update({
      where: { id: params.id },
      data: updateData,
      include: { claims: { include: { client: true } } },
    })
    .catch(() => null)

  if (!storeOrder) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(storeOrder)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.storeOrder.delete({ where: { id: params.id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
