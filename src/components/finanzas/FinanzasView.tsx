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

type StatementItem = {
  id: string
  productName: string | null
  productLink: string | null
  notes: string | null
  salePrice: number
  quantity: number
}
type StatementPayment = { id: string; amount: number; paymentDate: string; notes: string | null }
type ClientBalanceRow = {
  client: { id: string; fullName: string; phones: string[] }
  items: StatementItem[]
  payments: StatementPayment[]
  totalAmount: number
  totalPaid: number
  balance: number
  statementId: string | null
}

type CycleSummary = {
  clientCount: number
  revenue: number
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

function buildStatementText(row: ClientBalanceRow, cycleCode: string) {
  const lines = [`🧾 Estado de cuenta — ${row.client.fullName} — Ciclo ${cycleCode}`, '']
  if (row.items.length === 0) {
    lines.push('(sin productos)')
  } else {
    row.items.forEach((i, idx) => {
      const qtyLabel = i.quantity > 1 ? ` x${i.quantity}` : ''
      lines.push(`${idx + 1}. ${itemLabel(i)}${qtyLabel} — ${formatGTQ(i.salePrice * i.quantity)}`)
    })
  }
  lines.push('', `Total: ${formatGTQ(row.totalAmount)}`, `Pagado: ${formatGTQ(row.totalPaid)}`, `Saldo pendiente: ${formatGTQ(row.balance)}`)
  return lines.join('\n')
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

  async function copyStatement(row: ClientBalanceRow) {
    const text = buildStatementText(row, cycleCode)
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(row.client.id)
      setTimeout(() => setCopiedId((id) => (id === row.client.id ? null : id)), 2000)
    } catch {
      window.prompt('Copia este texto manualmente:', text)
    }
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
          {rows.map((row) => {
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
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold px-2 py-1 rounded shrink-0 ${
                      row.balance > 0 ? 'text-amber-700 bg-amber-50' : 'text-green-700 bg-green-50'
                    }`}
                  >
                    {row.balance > 0 ? `Debe ${formatGTQ(row.balance)}` : 'Al día'}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-brand-gray px-4 py-3">
                    <p className="text-xs font-medium text-brand-gray-dk mb-1">Productos</p>
                    <ul className="text-sm mb-3 space-y-0.5">
                      {row.items.map((i) => (
                        <li key={i.id} className="flex justify-between">
                          <span>
                            {itemLabel(i)}
                            {i.quantity > 1 && <span className="text-brand-blue"> ×{i.quantity}</span>}
                          </span>
                          <span>{formatGTQ(i.salePrice * i.quantity)}</span>
                        </li>
                      ))}
                      {row.items.length === 0 && <li className="text-brand-gray-dk">Sin productos.</li>}
                    </ul>

                    <p className="text-xs font-medium text-brand-gray-dk mb-1">Pagos</p>
                    <ul className="text-sm mb-3 space-y-0.5">
                      {row.payments.map((p) => (
                        <li key={p.id} className="flex justify-between items-center">
                          <span>
                            {fmtDate(p.paymentDate)} · {formatGTQ(p.amount)}
                            {p.notes && <span className="text-brand-gray-dk"> — {p.notes}</span>}
                          </span>
                          <button onClick={() => removePayment(p.id)} className="text-red-600 text-xs">
                            Deshacer
                          </button>
                        </li>
                      ))}
                      {row.payments.length === 0 && <li className="text-brand-gray-dk">Todavía no ha pagado nada.</li>}
                    </ul>

                    <div className="flex flex-wrap gap-2 items-end mb-3">
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

                    <button onClick={() => copyStatement(row)} className="text-xs text-brand-blue underline">
                      {copiedId === row.client.id ? 'Copiado ✓' : 'Copiar estado de cuenta para WhatsApp'}
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
