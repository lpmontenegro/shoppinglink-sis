import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeClientBalance } from '@/lib/finanzas'

// Un cliente aparece aquí si tiene al menos un pedido (Order) en el ciclo,
// sin importar si todos sus productos quedaron cancelados (en ese caso
// simplemente sale con total Q0). El total/saldo siempre se calcula en vivo.
export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])

  const orders = await prisma.order.findMany({
    where: { cycleId },
    distinct: ['clientId'],
    select: {
      client: { select: { id: true, fullName: true, phones: true } },
    },
    orderBy: { orderDate: 'asc' },
  })

  const rows = await Promise.all(
    orders.map(async ({ client }) => {
      const balance = await computeClientBalance(client.id, cycleId)
      return { client, ...balance }
    })
  )

  rows.sort((a, b) => a.client.fullName.localeCompare(b.client.fullName))

  return NextResponse.json(rows)
}
