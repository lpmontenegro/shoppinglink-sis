// Importa a un ciclo los pedidos de la hoja de Excel del equipo, ya limpiados
// y con los clientes revisados por Luis (archivo JSON generado aparte — NO va
// en el repo porque trae datos de clientes).
//
// Uso (desde la raíz del proyecto, PowerShell):
//   node scripts/import-ciclo.js --file "C:\Desarrollos\Claude outputs\import-ciclo-oct-2026.json" --cycle 2026-10 --dry-run
//   node scripts/import-ciclo.js --file "C:\Desarrollos\Claude outputs\import-ciclo-oct-2026.json" --cycle 2026-10
//
// Usa DATABASE_URL del .env — para producción, poner temporalmente la URL
// pública de Postgres de Railway (o correrlo con `railway run`).
//
// Qué hace, en una sola transacción (si algo falla no queda nada a medias):
//   1. Busca el ciclo por código (lo crea si no existe).
//   2. Se niega a correr si ese ciclo ya tiene productos importados de la
//      misma hoja (evita duplicar).
//   3. Crea los puntos de pickup que falten (por nombre).
//   4. Crea los clientes — si ya existe uno con el mismo nombre (sin importar
//      mayúsculas) lo reutiliza y solo le completa teléfono/dirección/zona si
//      los tenía vacíos.
//   5. Crea un pedido por cliente (o usa el que ya tenga en el ciclo) y los
//      productos: confirmados (ya se compraron), sin empacar (la maleta/caja
//      se define en Recepción), con precio vacío = precio pendiente.
//   6. Los productos sin cliente van al cliente interno "— Sin asignar —".
//   7. Registra los pagos anotados en la hoja como anticipos generales.

const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return def
  const v = process.argv[i + 1]
  return v && !v.startsWith('--') ? v : true
}

const FILE = arg('file')
const CYCLE = arg('cycle', '2026-10')
const DRY = !!arg('dry-run', false)
const UNASSIGNED = '— Sin asignar —'

if (!FILE || FILE === true) {
  console.error('Falta --file <ruta al JSON de importación>')
  process.exit(1)
}

const prisma = global.__PRISMA__ || new PrismaClient()

const round2 = (n) => Math.round(n * 100) / 100

async function main() {
  const data = JSON.parse(fs.readFileSync(path.resolve(FILE), 'utf8'))
  const rate = data.meta.exchangeRate
  const taxRate = data.meta.taxRate
  const refPrefix = 'SEPT!'

  console.log(`Archivo: ${FILE}`)
  console.log(`Base de datos: ${(() => { try { return new URL(process.env.DATABASE_URL).host } catch { return '(?)' } })()}`)
  console.log(`Ciclo: ${CYCLE} · tipo de cambio ${rate} · impuesto ${taxRate}%`)
  console.log(`${data.clients.length} clientes · ${data.items.length} productos · ${data.payments.length} pagos`)
  if (DRY) console.log('\n*** MODO PRUEBA (--dry-run): se hace todo y al final se deshace. ***\n')

  const summary = await prisma.$transaction(
    async (tx) => {
      // 1. Ciclo
      let cycle = await tx.cycle.findUnique({ where: { code: CYCLE } })
      if (!cycle) {
        cycle = await tx.cycle.create({
          data: { code: CYCLE, status: 'PACKING', openDate: new Date('2026-09-01'), taxRate, notes: 'Creado por la importación de la hoja SEPT' },
        })
        console.log(`Ciclo ${CYCLE} creado.`)
      }

      // 2. No duplicar
      const already = await tx.orderItem.count({ where: { importRef: { startsWith: refPrefix }, order: { cycleId: cycle.id } } })
      if (already > 0) throw new Error(`El ciclo ${CYCLE} ya tiene ${already} productos importados de la hoja. No se importa de nuevo.`)

      // 3. Puntos de pickup
      const pickupIds = {}
      for (const name of [...new Set(data.clients.map((c) => c.pickupPlace).filter(Boolean))]) {
        const existing = await tx.pickupPlace.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
        pickupIds[name] =
          existing?.id ??
          (await tx.pickupPlace.create({ data: { name, address: '', description: 'Creado por la importación (revisar dirección)' } })).id
      }

      // 4. Clientes
      const clientIds = {}
      let created = 0
      let reused = 0
      for (const c of data.clients) {
        const existing = await tx.client.findFirst({
          where: { isSystem: false, fullName: { equals: c.fullName, mode: 'insensitive' } },
        })
        const note = `Importado de la hoja SEPT (${c.source === 'salvamed' ? 'datos de Salvamed' : 'cliente nuevo'}); en la hoja: ${c.sheetNames.join(', ')}`
        if (existing) {
          reused++
          await tx.client.update({
            where: { id: existing.id },
            data: {
              phones: existing.phones.length ? existing.phones : c.phones,
              deliveryAddress: existing.deliveryAddress || c.deliveryAddress,
              zone: existing.zone || c.zone,
            },
          })
          clientIds[c.key] = existing.id
        } else {
          created++
          const cl = await tx.client.create({
            data: {
              fullName: c.fullName,
              phones: c.phones,
              deliveryAddress: c.deliveryAddress,
              zone: c.zone,
              fulfillmentMethod: c.fulfillmentMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
              pickupPlaceId: c.pickupPlace ? pickupIds[c.pickupPlace] : null,
              notes: [c.notes, note].filter(Boolean).join(' · '),
            },
          })
          clientIds[c.key] = cl.id
        }
      }

      // 6. Cliente interno "Sin asignar"
      const unassigned =
        (await tx.client.findFirst({ where: { isSystem: true, fullName: UNASSIGNED } })) ??
        (await tx.client.create({
          data: { fullName: UNASSIGNED, phones: [], deliveryAddress: '', zone: '', isSystem: true, notes: 'Cliente interno del sistema para productos sin dueño todavía. No borrar.' },
        }))

      // 5. Pedidos + productos
      const orderIds = {}
      async function orderFor(clientId) {
        if (orderIds[clientId]) return orderIds[clientId]
        const existing = await tx.order.findFirst({ where: { clientId, cycleId: cycle.id }, orderBy: { orderDate: 'asc' } })
        const order =
          existing ??
          (await tx.order.create({
            data: { clientId, cycleId: cycle.id, exchangeRate: rate, source: 'MANUAL', notes: 'Importado de la hoja SEPT' },
          }))
        orderIds[clientId] = order.id
        return order.id
      }

      const rows = []
      for (const it of data.items) {
        const clientId = it.client ? clientIds[it.client] : unassigned.id
        if (!clientId) throw new Error(`Cliente no encontrado para ${it.ref}: ${it.client}`)
        const notes = [it.notes, it.suitcaseHint ? 'Hoja: marcado para maleta/valija' : null].filter(Boolean).join('; ')
        rows.push({
          orderId: await orderFor(clientId),
          productName: it.productName,
          purchaseType: it.purchaseType,
          store: it.store,
          quantity: it.quantity,
          costUsd: it.costUsd,
          cost: it.purchaseType === 'COURIER' ? 0 : it.costUsd == null ? null : round2(it.costUsd * rate),
          salePrice: it.salePrice,
          confirmed: true,
          notes: notes || null,
          importRef: it.ref,
        })
      }
      await tx.orderItem.createMany({ data: rows })

      // 7. Pagos (anticipos generales)
      for (const p of data.payments) {
        const clientId = clientIds[p.client]
        const st = await tx.clientStatement.upsert({
          where: { clientId_cycleId: { clientId, cycleId: cycle.id } },
          create: { clientId, cycleId: cycle.id },
          update: {},
        })
        await tx.payment.create({
          data: { statementId: st.id, amount: p.amount, paymentDate: new Date(p.date), part: null, notes: p.notes },
        })
      }

      const totals = await tx.orderItem.findMany({
        where: { order: { cycleId: cycle.id }, importRef: { startsWith: refPrefix } },
        select: { quantity: true, salePrice: true, costUsd: true },
      })
      const result = {
        clientesCreados: created,
        clientesReutilizados: reused,
        pedidos: Object.keys(orderIds).length,
        productos: totals.length,
        unidades: totals.reduce((s, t) => s + t.quantity, 0),
        sinPrecio: totals.filter((t) => t.salePrice == null).length,
        totalConPrecioQ: round2(totals.reduce((s, t) => s + (t.salePrice == null ? 0 : Number(t.salePrice) * t.quantity), 0)),
        costoUsd: round2(totals.reduce((s, t) => s + (t.costUsd == null ? 0 : Number(t.costUsd) * t.quantity), 0)),
        pagos: data.payments.length,
        totalPagosQ: round2(data.payments.reduce((s, p) => s + p.amount, 0)),
      }
      if (DRY) {
        const err = new Error('DRY_RUN')
        err.result = result
        throw err
      }
      return result
    },
    { timeout: 180000, maxWait: 20000 }
  ).catch((e) => {
    if (e.message === 'DRY_RUN') return { ...e.result, dryRun: true }
    throw e
  })

  console.log('\nResultado:')
  console.table(summary)
  console.log(summary.dryRun ? '\nPrueba OK — no se guardó nada. Quita --dry-run para importar de verdad.' : '\nImportación terminada.')
}

main()
  .catch((e) => {
    console.error('\nERROR:', e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
