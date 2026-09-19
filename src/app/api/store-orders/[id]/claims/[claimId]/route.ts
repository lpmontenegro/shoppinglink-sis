import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOrderClaimUpdateSchema } from '@/lib/validations/storeOrder'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; claimId: string } }
) {
  const body = await req.json().catch(() => null)
  const parsed = storeOrderClaimUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existing = await prisma.storeOrderClaim.findUnique({ where: { id: params.claimId } })
  if (!existing || existing.storeOrderId !== params.id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const claim = await prisma.storeOrderClaim.update({
    where: { id: params.claimId },
    data: parsed.data,
    include: { client: true },
  })

  return NextResponse.json(claim)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; claimId: string } }
) {
  const existing = await prisma.storeOrderClaim.findUnique({ where: { id: params.claimId } })
  if (!existing || existing.storeOrderId !== params.id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  await prisma.storeOrderClaim.delete({ where: { id: params.claimId } })
  return NextResponse.json({ ok: true })
}
