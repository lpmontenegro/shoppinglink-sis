// Helpers de formato de moneda. Regla del negocio: todo se muestra en Quetzales
// (Q) como moneda principal; el dólar ($) se muestra como referencia adicional
// solo en pantallas internas/admin (nunca en algo que vea el cliente).

export function formatGTQ(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    currencyDisplay: 'narrowSymbol',
  }).format(n)
}

export function formatUSD(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n)
}

// Costo en quetzales a partir de un costo en dólares y el tipo de cambio.
export function usdToGtq(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100
}
