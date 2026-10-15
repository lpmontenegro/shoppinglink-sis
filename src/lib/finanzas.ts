import { prisma } from './prisma'

// ─── Estado de cuenta por entregas ───────────────────────────────────────────
//
// Un ciclo se entrega en DOS momentos: la entrega 1 es lo que viene en la
// maleta con las administradoras (packedIn = SUITCASE) y la entrega 2 lo que
// viene en la caja por courier (packedIn = BOX), semanas después. Cada
// entrega tiene su propio estado de cuenta: sus productos, su cargo de
// delivery (opcional), los pagos hechos para ESA entrega, y su saldo.
//
// - Productos todavía sin definir (ni maleta ni caja — antes de la
//   recepción) van en un grupo aparte "por definir": cuentan en el total del
//   ciclo pero no en el saldo de ninguna entrega.
// - Productos con precio pendiente (salePrice = null) se listan pero NO se
//   suman a nada — las dueñas todavía no fijan el precio.
// - Pagos sin entrega (part = null) son anticipos generales: se aplican
//   primero al saldo de la entrega 1 y lo que sobre a la entrega 2. Si aún
//   sobra, queda como saldo a favor.
//
// Todo se calcula EN VIVO desde OrderItem y Payment (nunca desde un campo
// guardado que se pudiera desincronizar). ClientStatement.totalAmount/
// totalPaid/balance son solo caché.

export type Part = 'SUITCASE' | 'BOX'
export type ItemPart = Part | 'UNDEFINED'

export type StatementItem = {
  id: string
  productName: string | null
  productLink: string | null
  notes: string | null
  salePrice: number | null
  quantity: number
  part: ItemPart
  received: boolean
  delivered: boolean
}

export type StatementPayment = {
  id: string
  amount: number
  paymentDate: Date
  notes: string | null
  part: Part | null
}

export type PartStatement = {
  items: StatementItem[]
  subtotal: number // suma de productos con precio
  pendingPriceCount: number
  deliveryFee: number
  total: number // subtotal + deliveryFee
  payments: StatementPayment[] // pagos hechos directo a esta entrega
  paidDirect: number
  advanceApplied: number // parte de los anticipos generales aplicada aquí
  balance: number // total − paidDirect − advanceApplied
}

export type ClientStatementData = {
  items: StatementItem[]
  payments: StatementPayment[]
  suitcase: PartStatement
  box: PartStatement
  undefinedPart: { items: StatementItem[]; subtotal: number; pendingPriceCount: number }
  advances: { payments: StatementPayment[]; total: number; unapplied: number }
  pendingPriceCount: number
  totalAmount: number
  totalPaid: number
  balance: number
  statementId: string | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

function itemPart(i: { packed: boolean; packedIn: string | null }): ItemPart {
  if (i.packed && i.packedIn === 'SUITCASE') return 'SUITCASE'
  if (i.packed && i.packedIn === 'BOX') return 'BOX'
  return 'UNDEFINED'
}

function lineTotal(i: StatementItem) {
  return i.salePrice == null ? 0 : i.salePrice * i.quantity
}

function buildPart(items: StatementItem[], fee: number, payments: StatementPayment[]): PartStatement {
  const subtotal = round2(items.reduce((s, i) => s + lineTotal(i), 0))
  const paidDirect = round2(payments.reduce((s, p) => s + p.amount, 0))
  const total = round2(subtotal + fee)
  return {
    items,
    subtotal,
    pendingPriceCount: items.filter((i) => i.salePrice == null).length,
    deliveryFee: fee,
    total,
    payments,
    paidDirect,
    advanceApplied: 0,
    balance: round2(total - paidDirect),
  }
}

type RawItem = {
  id: string
  productName: string | null
  productLink: string | null
  notes: string | null
  salePrice: unknown
  quantity: number
  packed: boolean
  packedIn: string | null
  received: boolean
  delivered: boolean
}
type RawStatement = {
  id: string
  deliveryFeeSuitcase: unknown
  deliveryFeeBox: unknown
  payments: { id: string; amount: unknown; paymentDate: Date; notes: string | null; part: string | null }[]
} | null

// Arma el estado de cuenta a partir de los datos ya leídos (sin tocar la base)
// — así se puede usar igual para un cliente o para muchos a la vez.
export function buildStatement(rawItems: RawItem[], statement: RawStatement): ClientStatementData {
  const items: StatementItem[] = rawItems.map((i) => ({
    id: i.id,
    productName: i.productName,
    productLink: i.productLink,
    notes: i.notes,
    salePrice: i.salePrice == null ? null : Number(i.salePrice),
    quantity: i.quantity,
    part: itemPart(i),
    received: i.received,
    delivered: i.delivered,
  }))
  const payments: StatementPayment[] = (statement?.payments ?? []).map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    paymentDate: p.paymentDate,
    notes: p.notes,
    part: (p.part as Part | null) ?? null,
  }))

  const suitcase = buildPart(
    items.filter((i) => i.part === 'SUITCASE'),
    Number(statement?.deliveryFeeSuitcase ?? 0),
    payments.filter((p) => p.part === 'SUITCASE')
  )
  const box = buildPart(
    items.filter((i) => i.part === 'BOX'),
    Number(statement?.deliveryFeeBox ?? 0),
    payments.filter((p) => p.part === 'BOX')
  )
  const undefItems = items.filter((i) => i.part === 'UNDEFINED')

  const advancePayments = payments.filter((p) => p.part == null)
  const advanceTotal = round2(advancePayments.reduce((s, p) => s + p.amount, 0))
  let remaining = advanceTotal
  for (const part of [suitcase, box]) {
    const apply = Math.max(0, Math.min(remaining, part.balance))
    part.advanceApplied = round2(apply)
    part.balance = round2(part.balance - apply)
    remaining = round2(remaining - apply)
  }

  const totalAmount = round2(
    suitcase.total + box.total + undefItems.reduce((s, i) => s + lineTotal(i), 0)
  )
  const totalPaid = round2(payments.reduce((s, p) => s + p.amount, 0))

  return {
    items,
    payments,
    suitcase,
    box,
    undefinedPart: {
      items: undefItems,
      subtotal: round2(undefItems.reduce((s, i) => s + lineTotal(i), 0)),
      pendingPriceCount: undefItems.filter((i) => i.salePrice == null).length,
    },
    advances: { payments: advancePayments, total: advanceTotal, unapplied: remaining },
    pendingPriceCount: items.filter((i) => i.salePrice == null).length,
    totalAmount,
    totalPaid,
    balance: round2(totalAmount - totalPaid),
    statementId: statement?.id ?? null,
  }
}

const itemSelect = {
  id: true,
  productName: true,
  productLink: true,
  notes: true,
  salePrice: true,
  quantity: true,
  packed: true,
  packedIn: true,
  received: true,
  delivered: true,
} as const

export async function computeClientBalance(clientId: string, cycleId: string): Promise<ClientStatementData> {
  const [items, statement] = await Promise.all([
    prisma.orderItem.findMany({
      where: { canceled: false, order: { clientId, cycleId } },
      select: itemSelect,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.clientStatement.findUnique({
      where: { clientId_cycleId: { clientId, cycleId } },
      include: { payments: { orderBy: { paymentDate: 'asc' } } },
    }),
  ])
  return buildStatement(items, statement)
}

// Estados de cuenta de varios clientes a la vez (2 consultas en total, no 2
// por cliente) — para la lista de estados de cuenta y para Distribución.
export async function computeStatementsForClients(
  clientIds: string[],
  cycleId: string
): Promise<Record<string, ClientStatementData>> {
  const ids = Array.from(new Set(clientIds))
  if (ids.length === 0) return {}
  const [items, statements] = await Promise.all([
    prisma.orderItem.findMany({
      where: { canceled: false, order: { cycleId, clientId: { in: ids } } },
      select: { ...itemSelect, order: { select: { clientId: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.clientStatement.findMany({
      where: { cycleId, clientId: { in: ids } },
      include: { payments: { orderBy: { paymentDate: 'asc' } } },
    }),
  ])
  const out: Record<string, ClientStatementData> = {}
  for (const id of ids) {
    out[id] = buildStatement(
      items.filter((i) => i.order.clientId === id),
      statements.find((s) => s.clientId === id) ?? null
    )
  }
  return out
}

// Guarda totalAmount/totalPaid/balance recién calculados en ClientStatement
// — puro caché, no se usa como fuente de verdad para leer.
export async function syncClientStatementCache(clientId: string, cycleId: string) {
  const s = await computeClientBalance(clientId, cycleId)
  if (s.statementId) {
    await prisma.clientStatement.update({
      where: { id: s.statementId },
      data: { totalAmount: s.totalAmount, totalPaid: s.totalPaid, balance: s.balance },
    })
  }
  return s
}

// Saldo por entrega de varios clientes — Distribución muestra el saldo de la
// entrega que se está repartiendo (maleta o caja).
export async function getPartBalancesForClients(
  clientIds: string[],
  cycleId: string,
  part: Part
): Promise<Record<string, number>> {
  const statements = await computeStatementsForClients(clientIds, cycleId)
  return Object.fromEntries(
    Object.entries(statements).map(([id, s]) => [id, part === 'SUITCASE' ? s.suitcase.balance : s.box.balance])
  )
}

// Resumen financiero del ciclo completo: ingresos (lo cobrado a clientes),
// costo de los productos (COGS), gastos del viaje, y ganancia neta. Los
// gastos del viaje son costos internos de Shopping Link — no se reparten
// entre clientes, solo bajan la ganancia del ciclo. Productos con precio
// pendiente no suman a ingresos (pero su costo sí, porque ya se pagó) — se
// reporta cuántos son, para que se note que el número todavía va a subir.
export async function computeCycleSummary(cycleId: string) {
  const [items, expenses, statements] = await Promise.all([
    prisma.orderItem.findMany({
      where: { canceled: false, order: { cycleId, client: { isSystem: false } } },
      select: { salePrice: true, cost: true, quantity: true, packed: true, packedIn: true, order: { select: { clientId: true } } },
    }),
    prisma.cycleExpense.findMany({ where: { cycleId }, orderBy: { date: 'asc' } }),
    prisma.clientStatement.findMany({ where: { cycleId }, include: { payments: true } }),
  ])
  const unassigned = await prisma.orderItem.findMany({
    where: { canceled: false, order: { cycleId, client: { isSystem: true } } },
    select: { cost: true, salePrice: true, quantity: true },
  })

  const fees = statements.reduce((s, st) => s + Number(st.deliveryFeeSuitcase) + Number(st.deliveryFeeBox), 0)
  const revenue = round2(items.reduce((sum, i) => sum + (i.salePrice == null ? 0 : Number(i.salePrice) * i.quantity), 0) + fees)
  const cogs = round2(
    [...items, ...unassigned].reduce((sum, i) => sum + (i.cost == null ? 0 : Number(i.cost) * i.quantity), 0)
  )
  const expensesTotal = round2(expenses.reduce((sum, e) => sum + Number(e.amount), 0))
  const grossProfit = round2(revenue - cogs)
  const netProfit = round2(grossProfit - expensesTotal)
  const totalPaid = round2(statements.reduce((sum, s) => sum + s.payments.reduce((s2, p) => s2 + Number(p.amount), 0), 0))

  const clientIds = Array.from(new Set(items.map((i) => i.order.clientId)))
  const byPart = (p: ItemPart) =>
    round2(
      items
        .filter((i) => itemPart(i) === p)
        .reduce((s, i) => s + (i.salePrice == null ? 0 : Number(i.salePrice) * i.quantity), 0)
    )

  return {
    clientCount: clientIds.length,
    revenue,
    revenueSuitcase: byPart('SUITCASE'),
    revenueBox: byPart('BOX'),
    revenueUndefined: byPart('UNDEFINED'),
    deliveryFees: round2(fees),
    pendingPriceCount: items.filter((i) => i.salePrice == null).length,
    missingCostCount: items.filter((i) => i.cost == null).length,
    unassignedCount: unassigned.length,
    unassignedValue: round2(unassigned.reduce((s, i) => s + (i.salePrice == null ? 0 : Number(i.salePrice) * i.quantity), 0)),
    cogs,
    grossProfit,
    expensesTotal,
    netProfit,
    totalPaid,
    balance: round2(revenue - totalPaid),
    expenses: expenses.map((e) => ({
      id: e.id,
      type: e.type,
      date: e.date,
      amount: Number(e.amount),
      description: e.description,
    })),
  }
}
