import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeStatementsForClients } from '@/lib/finanzas'

// Un cliente aparece aquí si tiene al menos un pedido (Order) en el ciclo,
// sin importar si todos sus productos quedaron cancelados (en ese caso
// simplemente sale con total Q0). El estado de cuenta (separado por entrega:
// maleta / caja) siempre se calcula en vivo. El cliente interno "Sin
// asignar" no aparece.
export async function GET(req: NextRequest) {
  const cycleId = req.nextUrl.searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])

  const orders = await prisma.order.findMany({
    where: { cycleId, client: { isSystem: false } },
    distinct: ['clientId'],
    select: {
      client: { select: { id: true, fullName: true, phones: true } },
    },
  })

  const statements = await computeStatementsForClients(
    orders.map((o) => o.client.id),
    cycleId
  )

  const rows = orders.map(({ client }) => ({ client, ...statements[client.id] }))
  rows.sort((a, b) => a.client.fullName.localeCompare(b.client.fullName))

  return NextResponse.json(rows)
}
