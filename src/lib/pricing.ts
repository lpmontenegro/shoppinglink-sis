// Precio sugerido para compras anticipadas (ADVANCE): costo + 7.5% + ganancia
// por rango de precio del producto, todo calculado en USD antes de convertir
// a Q. Fórmula confirmada en el plan de proyecto (17 sep 2026): la ganancia
// es $8 para productos menores a $20, $10 de $20 a $40, $12 de $40 a $60, y
// 20% para productos de $60 en adelante. Es solo una sugerencia — el precio
// de venta final (salePrice) siempre queda editable a mano.

export function suggestedProfitUsd(costUsd: number): number {
  if (costUsd < 20) return 8
  if (costUsd < 40) return 10
  if (costUsd < 60) return 12
  return costUsd * 0.2
}

export function suggestedSalePriceUsd(costUsd: number): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0
  const withTax = costUsd * 1.075
  return withTax + suggestedProfitUsd(costUsd)
}
