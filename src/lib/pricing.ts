// Precio sugerido para compras anticipadas (ADVANCE): costo + impuesto de
// compra en USA (varía por ciclo/estado, 7.5% de default) + ganancia por
// rango de precio del producto, todo calculado en USD antes de convertir a
// Q. Fórmula confirmada en el plan de proyecto (17 sep 2026): la ganancia es
// $8 para productos menores a $20, $10 de $20 a $40, $12 de $40 a $60, y 20%
// para productos de $60 en adelante. Es solo una sugerencia — el precio de
// venta final (salePrice) siempre queda editable a mano.

export const DEFAULT_TAX_RATE = 7.5

export function suggestedProfitUsd(costUsd: number): number {
  if (costUsd < 20) return 8
  if (costUsd < 40) return 10
  if (costUsd < 60) return 12
  return costUsd * 0.2
}

// Costo del producto incluyendo el impuesto de compra (la base real sobre la
// que se calcula la ganancia).
export function costWithTax(cost: number, taxRatePercent: number = DEFAULT_TAX_RATE): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0
  return cost * (1 + taxRatePercent / 100)
}

export function suggestedSalePriceUsd(
  costUsd: number,
  taxRatePercent: number = DEFAULT_TAX_RATE
): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0
  return costWithTax(costUsd, taxRatePercent) + suggestedProfitUsd(costUsd)
}
