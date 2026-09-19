export const CYCLE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Recibiendo pedidos',
  ORDERS_CLOSED: 'Pedidos cerrados',
  TRAVELING: 'De viaje',
  PACKING: 'Empacando',
  DELIVERING: 'Entregando',
  DONE: 'Cerrado',
}

export const CYCLE_STATUS_COLORS: Record<string, string> = {
  OPEN: 'text-green-700 bg-green-50',
  ORDERS_CLOSED: 'text-amber-700 bg-amber-50',
  TRAVELING: 'text-blue-700 bg-blue-50',
  PACKING: 'text-purple-700 bg-purple-50',
  DELIVERING: 'text-indigo-700 bg-indigo-50',
  DONE: 'text-brand-gray-dk bg-brand-gray-lt',
}
