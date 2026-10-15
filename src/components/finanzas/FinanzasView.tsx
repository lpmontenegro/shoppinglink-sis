'use client'

import { useEffect, useState } from 'react'
import { formatGTQ } from '@/lib/currency'
import GastoModal from './GastoModal'

type CicloOption = { id: string; code: string; status: string }

type Expense = {
  id: string
  cycleId: string
  type: string
  date: string
  amount: number
  description: string | null
}

type Part = 'SUITCASE' | 'BOX'
type StatementItem = {
  id: string
  productName: string | null
  productLink: string | null
  notes: string | null
  salePrice: number | null
  quantity: number
  part: Part | 'UNDEFINED'
  received: boolean
  delivered: boolean
}
type StatementPayment = { id: string; amount: number; paymentDate: string; notes: string | null; part: Part | null }
type PartStatement = {
  items: StatementItem[]
  subtotal: number
  pendingPriceCount: number
  deliveryFee: number
  total: number
  payments: StatementPayment[]
  paidDirect: number
  advanceApplied: number
  balance: number
}
type ClientBalanceRow = {
  client: { id: string; fullName: string; phones: string[] }
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

type CycleSummary = {
  clientCount: number
  revenue: number
  revenueSuitcase: number
  revenueBox: number
  revenueUndefined: number
  deliveryFees: number
  pendingPriceCount: number
  missingCostCount: number
  unassignedCount: number
  unassignedValue: number
  cogs: number
  grossProfit: number
  expensesTotal: number
  netProfit: number
  totalPaid: number
  balance: number
}

type Tab = 'resumen' | 'gastos' | 'cuentas'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function itemLabel(i: StatementItem) {
  return i.productName || i.productLink || i.notes || 'Producto'
}

function balanceLabel(balance: number, hasItems: boolean) {
  if (balance > 0) return `Debe ${formatGTQ(balance)}`
  if (balance < 0) return `A favor ${formatGTQ(-balance)}`
  return hasItems ? 'Al día' : '—'
}

const PART_TITLE: Record<Part, string> = {
  SUITCASE: 'Entrega 1 — llegó con las administradoras (maleta)',
  BOX: 'Entrega 2 — llega en la caja',
}

function lineLabel(i: StatementItem) {
  const qty = i.quantity > 1 ? ` x${i.quantity}` : ''
  const price = i.salePrice == null ? 'precio por confirmar' : formatGTQ(i.salePrice * i.quantity)
  return `${itemLabel(i)}${qty} — ${price}`
}

function partText(row: ClientBalanceRow, part: Part) {
  const p = part === 'SUITCASE' ? row.suitcase : row.box
  const lines = [`*${PART_TITLE[part]}*`]
  if (p.items.length === 0) lines.push('(sin productos)')
  p.items.forEach((i, idx) => lines.push(`${idx + 1}. ${lineLabel(i)}`))
  lines.push(`Subtotal: ${formatGTQ(p.subtotal)}`)
  if (p.deliveryFee > 0) lines.push(`Delivery: ${formatGTQ(p.deliveryFee)}`)
  p.payments.forEach((pay) => lines.push(`Pago ${fmtDate(pay.paymentDate)}: −${formatGTQ(pay.amount)}`))
  if (p.advanceApplied > 0) lines.push(`Anticipo aplicado: −${formatGTQ(p.advanceApplied)}`)
  lines.push(
    p.balance < 0
      ? `*Saldo a favor ${part === 'SUITCASE' ? 'entrega 1' : 'entrega 2'}: ${formatGTQ(-p.balance)}*`
      : `*Saldo ${part === 'SUITCASE' ? 'entrega 1' : 'entrega 2'}: ${formatGTQ(p.balance)}*`
  )
  if (p.pendingPriceCount > 0)
    lines.push(`(${p.pendingPriceCount} producto${p.pendingPriceCount === 1 ? '' : 's'} con precio por confirmar, no incluido${p.pendingPriceCount === 1 ? '' : 's'})`)
  return lines.join('\n')
}

function buildStatementText(row: ClientBalanceRow, cycleCode: string, which: Part | 'ALL') {
  const parts: string[] = [`🧾 Estado de cuenta — ${row.client.fullName} — Ciclo ${cycleCode}`]
  if (which === 'SUITCASE' || which === 'ALL') parts.push(partText(row, 'SUITCASE'))
  if (which === 'BOX' || which === 'ALL') parts.push(partText(row, 'BOX'))
  if (which === 'ALL' && row.undefinedPart.items.length > 0) {
    parts.push(
      ['*Por confirmar si viene en maleta o caja*', ...row.undefinedPart.items.map((i, idx) => `${idx + 1}. ${lineLabel(i)}`)].join('\n')
    )
  }
  if (row.advances.unapplied > 0) parts.push(`Saldo a favor: ${formatGTQ(row.advances.unapplied)}`)
  return parts.join('\n\n')
}

export default function FinanzasView({
  ciclos,
  selectedCycleId,
}: {
  ciclos: CicloOption[]
  selectedCycleId?: string
}) {
  const [cycleId, setCycleId] = useState(selectedCycleId ?? '')
  const [tab, setTab] = useState<Tab>('resumen')

  const [summary, setSummary] = useState<CycleSummary | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [rows, setRows] = useState<ClientBalanceRow[]>([])
  const [loading, setLoading] = useState(false)

  const [gastoModal, setGastoModal] = useState<{ expense?: Expense } | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [payAmount, setPayAmount] = useState<Record<string, string>>({})
  const [payDate, setPayDate] = useState<Record<string, string>>({})
  const [payNotes, setPayNotes] = useState<Record<string, string>>({})
  const [payPart, setPayPart] = useState<Record<string, string>>({})
  const [feeDraft, setFeeDraft] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const cycleCode = ciclos.find((c) => c.id === cycleId)?.code ?? ''

  async function loadSummary(id: string) {
    if (!id) return setSummary(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/finanzas/resumen?cycleId=${id}`)
      setSummary(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function loadExpenses(id: string) {
    if (!id) return setExpenses([])
    setLoading(true)
    try {
      const res = await fetch(`/api/gastos?cycleId=${id}`)
      setExpenses(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function loadRows(id: string) {
    if (!id) return setRows([])
    setLoading(true)
    try {
      const res = await fetch(`/api/estados-cuenta?cycleId=${id}`)
      setRows(await res.json())
    } finally {
      setLoading(false)
    }
  }

  function loadTab(t: Tab, id: string) {
    if (t === 'resumen') loadSummary(id)
    else if (t === 'gastos') loadExpenses(id)
    else loadRows(id)
  }

  useEffect(() => {
    loadTab(tab, cycleId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, cycleId])

  function refreshAll() {
    setGastoModal(null)
    loadTab(tab, cycleId)
    // el resumen depende de gastos y de pagos, así que si estamos en otra
    // pestaña igual lo refrescamos en segundo plano para que no quede viejo
    if (tab !== 'resumen') loadSummary(cycleId)
  }

  async function deleteExpense(id: string) {
    if (!window.confirm('¿Quitar este gasto?')) return
    await fetch(`/api/gastos/${id}`, { method: 'DELETE' })
    refreshAll()
  }

  async function registerPayment(clientId: string) {
    setError('')
    const amount = parseFloat(payAmount[clientId] || '')
    if (!amount || amount <= 0) {
      setError('Ingresa un monto válido para el pago.')
      return
    }
    const res = await fetch('/api/estados-cuenta/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        cycleId,
        amount,
        paymentDate: payDate[clientId] || todayInput(),
        part: (payPart[clientId] ?? 'SUITCASE') === 'GENERAL' ? null : payPart[clientId] ?? 'SUITCASE',
        notes: payNotes[clientId] || null,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(data?.error && typeof data.error === 'string' ? data.error : 'No se pudo registrar el pago.')
      return
    }
    setPayAmount((prev) => ({ ...prev, [clientId]: '' }))
    setPayNotes((prev) => ({ ...prev, [clientId]: '' }))
    loadRows(cycleId)
    if (tab !== 'resumen') loadSummary(cycleId)
  }

  async function removePayment(paymentId: string) {
    await fetch(`/api/estados-cuenta/payments/${paymentId}`, { method: 'DELETE' })
    loadRows(cycleId)
  }

  async function setPaymentPart(paymentId: string, part: string) {
    await fetch(`/api/estados-cuenta/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part: part === 'GENERAL' ? null : part }),
    })
    loadRows(cycleId)
  }

  async function saveDeliveryFee(clientId: string, part: Part) {
    const key = `${clientId}:${part}`
    const amount = parseFloat(feeDraft[key] ?? '')
    if (!(amount >= 0)) return
    await fetch('/api/estados-cuenta/delivery-fee', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, cycleId, part, amount }),
    })
    setFeeDraft((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    loadRows(cycleId)
  }

  async function copyStatement(row: ClientBalanceRow, which: Part | 'ALL') {
    const text = buildStatementText(row, cycleCode, which)
    const id = `${row.client.id}:${which}`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000)
    } catch {
      window.prompt('Copia este texto manualmente:', text)
    }
  }

  function renderPayment(p: StatementPayment) {
    return (
      <li key={p.id} className="flex flex-wrap justify-between items-center gap-2">
        <span>
          {fmtDate(p.paymentDate)} · {formatGTQ(p.amount)}
          {p.notes && <span className="text-brand-gray-dk"> — {p.notes}</span>}
        </span>
        <span className="flex items-center gap-2">
          <select
            value={p.part ?? 'GENERAL'}
            onChange={(e) => setPaymentPart(p.id, e.target.value)}
            className="text-xs border border-brand-gray rounded px-1 py-0.5"
            title="A qué entrega se aplica este pago"
          >
            <option value="SUITCASE">Entrega 1 (maleta)</option>
            <option value="BOX">Entrega 2 (caja)</option>
            <option value="GENERAL">Anticipo general</option>
          </select>
          <button onClick={() => removePayment(p.id)} className="text-red-600 text-xs">
            Deshacer
          </button>
        </span>
      </li>
    )
  }

  function renderItems(list: StatementItem[]) {
    return (
      <ul className="text-sm space-y-0.5">
        {list.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span className={i.delivered ? 'text-brand-gray-dk' : ''}>
              {itemLabel(i)}
              {i.quantity > 1 && <span className="text-brand-blue"> ×{i.quantity}</span>}
              {i.delivered && <span className="text-xs text-green-700"> · entregado</span>}
            </span>
            {i.salePrice == null ? (
              <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">Precio pendiente</span>
            ) : (
              <span className="shrink-0">{formatGTQ(i.salePrice * i.quantity)}</span>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="text-brand-gray-dk">Sin productos.</li>}
      </ul>
    )
  }

  function renderPart(row: ClientBalanceRow, part: Part) {
    const p = part === 'SUITCASE' ? row.suitcase : row.box
    const key = `${row.client.id}:${part}`
    return (
      <div className="border border-brand-gray rounded p-3">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold text-brand-black">
            {part === 'SUITCASE' ? '🧳 Entrega 1 — maleta' : '📦 Entrega 2 — caja'}
          </p>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              p.balance > 0 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'
            }`}
          >
            {balanceLabel(p.balance, p.items.length > 0)}
          </span>
        </div>
        {renderItems(p.items)}
        <div className="mt-2 text-sm space-y-0.5 border-t border-brand-gray-lt pt-2">
          <div className="flex justify-between">
            <span className="text-brand-gray-dk">Subtotal</span>
            <span>{formatGTQ(p.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-brand-gray-dk">Delivery (opcional)</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step="1"
                value={feeDraft[key] ?? String(p.deliveryFee)}
                onChange={(e) => setFeeDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                onBlur={() => feeDraft[key] !== undefined && saveDeliveryFee(row.client.id, part)}
                className="w-20 px-1 py-0.5 border border-brand-gray rounded text-sm text-right"
              />
            </span>
          </div>
          {p.paidDirect > 0 && (
            <div className="flex justify-between">
              <span className="text-brand-gray-dk">Pagado a esta entrega</span>
              <span>−{formatGTQ(p.paidDirect)}</span>
            </div>
          )}
          {p.advanceApplied > 0 && (
            <div className="flex justify-between">
              <span className="text-brand-gray-dk">Anticipo aplicado</span>
              <span>−{formatGTQ(p.advanceApplied)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold">
            <span>Saldo</span>
            <span>{formatGTQ(p.balance)}</span>
          </div>
          {p.pendingPriceCount > 0 && (
            <p className="text-xs text-amber-700">
              {p.pendingPriceCount} producto{p.pendingPriceCount === 1 ? '' : 's'} con precio pendiente (no incluidos)
            </p>
          )}
        </div>
        {p.payments.length > 0 && <ul className="text-sm mt-2 space-y-0.5">{p.payments.map(renderPayment)}</ul>}
        <button onClick={() => copyStatement(row, part)} className="mt-2 text-xs text-brand-blue underline">
          {copiedId === key ? 'Copiado ✓' : `Copiar entrega ${part === 'SUITCASE' ? '1' : '2'} para WhatsApp`}
        </button>
      </div>
    )
  }

  const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-black mb-1">Finanzas del ciclo</h1>
      <p className="text-sm text-brand-gray-dk mb-4">
        Gastos del viaje, saldos de clientes y ganancia real del ciclo.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={cycleId}
          onChange={(e) => setCycleId(e.target.value)}
          className="px-3 py-2 border border-brand-gray rounded text-sm"
        >
          <option value="">Seleccionar ciclo...</option>
          {ciclos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded border border-brand-gray overflow-hidden text-sm">
          <button
            onClick={() => setTab('resumen')}
            className={`px-3 py-2 ${tab === 'resumen' ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray-dk'}`}
          >
            Resumen
          </button>
          <button
            onClick={() => setTab('gastos')}
            className={`px-3 py-2 ${tab === 'gastos' ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray-dk'}`}
          >
            Gastos
          </button>
          <button
            onClick={() => setTab('cuentas')}
            className={`px-3 py-2 ${tab === 'cuentas' ? 'bg-brand-blue text-white' : 'bg-white text-brand-gray-dk'}`}
          >
            Estados de cuenta
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {!cycleId && <p className="text-sm text-brand-gray-dk">Selecciona un ciclo para ver sus finanzas.</p>}

      {cycleId && loading && <p className="text-sm text-brand-gray-dk">Cargando...</p>}

      {cycleId && !loading && tab === 'resumen' && summary && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">Facturado a clientes</p>
              <p className="mt-1 text-xl font-bold text-brand-black">{formatGTQ(summary.revenue)}</p>
            </div>
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">Cobrado</p>
              <p className="mt-1 text-xl font-bold text-brand-black">{formatGTQ(summary.totalPaid)}</p>
            </div>
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">Saldo pendiente de clientes</p>
              <p className={`mt-1 text-xl font-bold ${summary.balance > 0 ? 'text-amber-700' : 'text-brand-black'}`}>
                {formatGTQ(summary.balance)}
              </p>
            </div>
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">Costo de productos</p>
              <p className="mt-1 text-xl font-bold text-brand-black">{formatGTQ(summary.cogs)}</p>
            </div>
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">Gastos del viaje</p>
              <p className="mt-1 text-xl font-bold text-brand-black">{formatGTQ(summary.expensesTotal)}</p>
            </div>
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">Ganancia bruta (antes de gastos)</p>
              <p className="mt-1 text-xl font-bold text-brand-black">{formatGTQ(summary.grossProfit)}</p>
            </div>
          </div>

          <div className={`rounded-lg p-5 ${summary.netProfit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className="text-sm text-brand-gray-dk">Ganancia neta del ciclo (facturado − costo de productos − gastos del viaje)</p>
            <p className={`mt-1 text-3xl font-bold ${summary.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatGTQ(summary.netProfit)}
            </p>
            <p className="mt-1 text-xs text-brand-gray-dk">
              {summary.clientCount} cliente{summary.clientCount === 1 ? '' : 's'} con pedidos en este ciclo. Los gastos del
              viaje son costos internos — no se reparten ni se cobran a los clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">🧳 Entrega 1 (maleta)</p>
              <p className="mt-1 text-lg font-bold text-brand-black">{formatGTQ(summary.revenueSuitcase)}</p>
            </div>
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">📦 Entrega 2 (caja)</p>
              <p className="mt-1 text-lg font-bold text-brand-black">{formatGTQ(summary.revenueBox)}</p>
            </div>
            <div className="bg-white border border-brand-gray rounded-lg p-4">
              <p className="text-xs text-brand-gray-dk">Por definir (sin recepción)</p>
              <p className="mt-1 text-lg font-bold text-brand-black">{formatGTQ(summary.revenueUndefined)}</p>
            </div>
          </div>

          {(summary.pendingPriceCount > 0 || summary.unassignedCount > 0 || summary.missingCostCount > 0) && (
            <div className="mt-4 rounded-lg p-4 bg-amber-50 border border-amber-200 text-sm text-amber-800">
              <p className="font-bold mb-1">Estos números todavía van a cambiar:</p>
              <ul className="list-disc ml-5 space-y-0.5">
                {summary.pendingPriceCount > 0 && (
                  <li>{summary.pendingPriceCount} productos con precio pendiente (no suman a lo facturado).</li>
                )}
                {summary.unassignedCount > 0 && (
                  <li>
                    {summary.unassignedCount} productos sin cliente asignado ({formatGTQ(summary.unassignedValue)} en precio de
                    venta que todavía no se le cobra a nadie; su costo sí cuenta).
                  </li>
                )}
                {summary.missingCostCount > 0 && <li>{summary.missingCostCount} productos sin costo anotado.</li>}
              </ul>
              <p className="mt-1">
                Complétalos en <a href="/pendientes" className="underline">Pendientes</a>.
              </p>
            </div>
          )}
        </div>
      )}

      {cycleId && !loading && tab === 'gastos' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-brand-gray-dk">
              Total de gastos: <span className="font-medium text-brand-black">{formatGTQ(expensesTotal)}</span>
            </p>
            <button
              onClick={() => setGastoModal({})}
              className="px-4 py-2 bg-brand-blue text-white rounded font-medium text-sm"
            >
              + Agregar gasto
            </button>
          </div>

          <div className="bg-white border border-brand-gray rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-gray-lt text-left text-brand-gray-dk">
                <tr>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Descripción</th>
                  <th className="px-4 py-2">Monto</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-brand-gray">
                    <td className="px-4 py-2">{e.type}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{fmtDate(e.date)}</td>
                    <td className="px-4 py-2 text-brand-gray-dk">{e.description || '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{formatGTQ(e.amount)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap space-x-2">
                      <button onClick={() => setGastoModal({ expense: e })} className="text-brand-blue">
                        Editar
                      </button>
                      <button onClick={() => deleteExpense(e.id)} className="text-red-600">
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-brand-gray-dk">
                      No hay gastos registrados en este ciclo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {cycleId && !loading && tab === 'cuentas' && (
        <div className="space-y-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full px-3 py-2 border border-brand-gray rounded text-sm"
          />
          {rows
            .filter((r) => !filter.trim() || r.client.fullName.toLowerCase().includes(filter.trim().toLowerCase()))
            .map((row) => {
              const isOpen = !!expanded[row.client.id]
              return (
                <div key={row.client.id} className="bg-white border border-brand-gray rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded((prev) => ({ ...prev, [row.client.id]: !prev[row.client.id] }))}
                    className="w-full flex flex-wrap justify-between items-center gap-2 px-4 py-3 text-left"
                  >
                    <div>
                      <p className="font-medium text-brand-black">{row.client.fullName}</p>
                      <p className="text-xs text-brand-gray-dk">
                        {row.items.length} producto{row.items.length === 1 ? '' : 's'} · Total {formatGTQ(row.totalAmount)} ·
                        Pagado {formatGTQ(row.totalPaid)}
                        {row.pendingPriceCount > 0 && (
                          <span className="text-amber-700"> · {row.pendingPriceCount} sin precio</span>
                        )}
                      </p>
                    </div>
                    <span className="flex flex-wrap gap-1 shrink-0 text-xs font-bold">
                      <span
                        className={`px-2 py-1 rounded ${
                          row.suitcase.balance > 0 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'
                        }`}
                      >
                        🧳 {balanceLabel(row.suitcase.balance, row.suitcase.items.length > 0)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded ${
                          row.box.balance > 0 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'
                        }`}
                      >
                        📦 {balanceLabel(row.box.balance, row.box.items.length > 0)}
                      </span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-brand-gray px-4 py-3 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        {renderPart(row, 'SUITCASE')}
                        {renderPart(row, 'BOX')}
                      </div>

                      {row.undefinedPart.items.length > 0 && (
                        <div className="border border-dashed border-brand-gray rounded p-3">
                          <p className="text-sm font-bold text-brand-black mb-1">
                            Por definir (todavía no se marca en Recepción si llegó en maleta o viene en caja)
                          </p>
                          {renderItems(row.undefinedPart.items)}
                          <p className="text-sm mt-1 text-brand-gray-dk">Subtotal: {formatGTQ(row.undefinedPart.subtotal)}</p>
                        </div>
                      )}

                      {row.advances.payments.length > 0 && (
                        <div className="border border-brand-gray rounded p-3">
                          <p className="text-sm font-bold text-brand-black mb-1">
                            Anticipos generales — {formatGTQ(row.advances.total)}
                          </p>
                          <p className="text-xs text-brand-gray-dk mb-1">
                            Se aplican primero a la entrega 1 y lo que sobra a la entrega 2. Puedes moverlos a una entrega
                            específica.
                            {row.advances.unapplied > 0 && ` Saldo a favor sin aplicar: ${formatGTQ(row.advances.unapplied)}.`}
                          </p>
                          <ul className="text-sm space-y-0.5">{row.advances.payments.map(renderPayment)}</ul>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 items-end">
                        <div>
                          <label className="block text-[10px] text-brand-gray-dk mb-0.5">Monto (Q)</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            value={payAmount[row.client.id] ?? ''}
                            onChange={(e) => setPayAmount((prev) => ({ ...prev, [row.client.id]: e.target.value }))}
                            className="w-24 px-2 py-1.5 border border-brand-gray rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-brand-gray-dk mb-0.5">Fecha</label>
                          <input
                            type="date"
                            value={payDate[row.client.id] ?? todayInput()}
                            onChange={(e) => setPayDate((prev) => ({ ...prev, [row.client.id]: e.target.value }))}
                            className="px-2 py-1.5 border border-brand-gray rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-brand-gray-dk mb-0.5">Aplicar a</label>
                          <select
                            value={payPart[row.client.id] ?? 'SUITCASE'}
                            onChange={(e) => setPayPart((prev) => ({ ...prev, [row.client.id]: e.target.value }))}
                            className="px-2 py-1.5 border border-brand-gray rounded text-sm"
                          >
                            <option value="SUITCASE">Entrega 1 (maleta)</option>
                            <option value="BOX">Entrega 2 (caja)</option>
                            <option value="GENERAL">Anticipo general</option>
                          </select>
                        </div>
                        <input
                          placeholder="Nota (opcional)"
                          value={payNotes[row.client.id] ?? ''}
                          onChange={(e) => setPayNotes((prev) => ({ ...prev, [row.client.id]: e.target.value }))}
                          className="flex-1 min-w-[120px] px-2 py-1.5 border border-brand-gray rounded text-sm"
                        />
                        <button
                          onClick={() => registerPayment(row.client.id)}
                          className="px-3 py-1.5 bg-brand-blue text-white rounded text-sm"
                        >
                          Registrar pago
                        </button>
                      </div>

                      <button onClick={() => copyStatement(row, 'ALL')} className="text-xs text-brand-blue underline">
                        {copiedId === `${row.client.id}:ALL` ? 'Copiado ✓' : 'Copiar estado de cuenta completo para WhatsApp'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          {rows.length === 0 && (
            <p className="text-center text-brand-gray-dk py-6">No hay clientes con pedidos en este ciclo.</p>
          )}
        </div>
      )}

      {gastoModal && cycleId && (
        <GastoModal
          cycleId={cycleId}
          expense={gastoModal.expense}
          onClose={() => setGastoModal(null)}
          onSaved={refreshAll}
        />
      )}
    </div>
  )
}
