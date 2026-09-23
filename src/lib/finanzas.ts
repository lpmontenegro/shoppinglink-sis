import { prisma } from './prisma'

// El total que debe un cliente por un ciclo SIEMPRE se calcula en vivo a
// partir de sus OrderItem no cancelados (nunca se confía en un campo
// guardado que se podría desincronizar) — mismo criterio que el resto del
// sistema (ej. costo se recalcula del tipo de cambio en vez de guardarse
// fijo). El campo totalAmount/totalPaid/balance en ClientStatement se
// actualiza como caché después de cada cambio, pero solo para lectura
// rápida futura si hiciera falta — esta función es la fuente de verdad.
export async function computeClientBalance(clientId: string, cycleId: string) {
  const [items, statement] = await Promise.all([
    prisma.orderItem.findMany({
      where: { canceled: false, order: { clientId, cycleId } },
      select: { id: true, productName: true, productLink: true, notes: true, salePrice: true, quantity: true },
    }),
    prisma.clientStatement.findUnique({
      where: { clientId_cycleId: { clientId, cycleId } },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
    }),
  ])

  const totalAmount = items.reduce((sum, i) => sum + Number(i.salePrice) * i.quantity, 0)
  const totalPaid = statement ? statement.payments.reduce((sum, p) => sum + Number(p.amount), 0) : 0
  const balance = totalAmount - totalPaid

  return {
    items: items.map((i) => ({
      id: i.id,
      productName: i.productName,
      productLink: i.productLink,
      notes: i.notes,
      salePrice: Number(i.salePrice),
      quantity: i.quantity,
    })),
    payments:
      statement?.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        notes: p.notes,
      })) ?? [],
    totalAmount,
    totalPaid,
    balance,
    statementId: statement?.id ?? null,
  }
}

// Guarda totalAmount/totalPaid/balance recién calculados en ClientStatement
// — puro caché, no se usa como fuente de verdad para leer.
export async function syncClientStatementCache(clientId: string, cycleId: string) {
  const { totalAmount, totalPaid, balance, statementId } = await computeClientBalance(clientId, cycleId)
  if (statementId) {
    await prisma.clientStatement.update({ where: { id: statementId }, data: { totalAmount, totalPaid, balance } })
  }
  return { totalAmount, totalPaid, balance }
}

// Saldo pendiente (balance) de varios clientes a la vez para un ciclo — se
// usa en Distribución, para saber de un vistazo si hay que cobrar algo al
// entregar. No se calcula el detalle de items/pagos, solo el número.
export async function getBalancesForClients(clientIds: string[], cycleId: string): Promise<Record<string, number>> {
  const uniqueIds = Array.from(new Set(clientIds))
  if (uniqueIds.length === 0) return {}
  const entries = await Promise.all(
    uniqueIds.map(async (clientId) => {
      const { balance } = await computeClientBalance(clientId, cycleId)
      return [clientId, balance] as const
    })
  )
  return Object.fromEntries(entries)
}

// Resumen financiero del ciclo completo: ingresos (lo cobrado a clientes),
// costo de los productos (COGS), gastos del viaje, y ganancia neta. Los
// gastos del viaje son costos internos de Shopping Link — no se reparten
// entre clientes, solo bajan la ganancia del ciclo.
export async function computeCycleSummary(cycleId: string) {
  const [items, expenses] = await Promise.all([
    prisma.orderItem.findMany({
      where: { canceled: false, order: { cycleId } },
      select: { salePrice: true, cost: true, quantity: true, order: { select: { clientId: true } } },
    }),
    prisma.cycleExpense.findMany({ where: { cycleId }, orderBy: { date: 'asc' } }),
  ])

  const revenue = items.reduce((sum, i) => sum + Number(i.salePrice) * i.quantity, 0)
  const cogs = items.reduce((sum, i) => sum + Number(i.cost) * i.quantity, 0)
  const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const grossProfit = revenue - cogs
  const netProfit = grossProfit - expensesTotal

  const clientIds = Array.from(new Set(items.map((i) => i.order.clientId)))
  const statements = clientIds.length
    ? await prisma.clientStatement.findMany({
        where: { cycleId, clientId: { in: clientIds } },
        include: { payments: true },
      })
    : []
  const totalPaid = statements.reduce(
    (sum, s) => sum + s.payments.reduce((s2, p) => s2 + Number(p.amount), 0),
    0
  )

  return {
    clientCount: clientIds.length,
    revenue,
    cogs,
    grossProfit,
    expensesTotal,
    netProfit,
    totalPaid,
    balance: revenue - totalPaid,
    expenses: expenses.map((e) => ({
      id: e.id,
      type: e.type,
      date: e.date,
      amount: Number(e.amount),
      description: e.description,
    })),
  }
}
