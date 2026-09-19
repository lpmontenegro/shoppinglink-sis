import { prisma } from './prisma'

// Tipo de cambio USD -> GTQ, guardado en SystemSetting como un valor global
// editable. Cada pedido que se crea guarda una copia (snapshot) del valor
// vigente en ese momento, así que cambiar esto no altera pedidos ya creados.
const EXCHANGE_RATE_KEY = 'exchange_rate_usd_gtq'
const DEFAULT_EXCHANGE_RATE = 7.75

export async function getExchangeRate(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: EXCHANGE_RATE_KEY },
  })
  if (!setting) return DEFAULT_EXCHANGE_RATE
  const value = parseFloat(setting.value)
  return Number.isFinite(value) ? value : DEFAULT_EXCHANGE_RATE
}

export async function setExchangeRate(rate: number): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: EXCHANGE_RATE_KEY },
    update: { value: rate.toString() },
    create: { key: EXCHANGE_RATE_KEY, value: rate.toString() },
  })
}
