import { prisma } from './prisma'

// Cliente interno "Sin asignar": aquí quedan los productos que todavía no
// tienen dueño (ej. al importar la hoja del equipo, las filas sin nombre de
// cliente). Desde la pantalla Pendientes se reasignan al cliente real.
// isSystem = true lo saca de Clientes, Estados de cuenta y Distribución.
export const UNASSIGNED_CLIENT_NAME = '— Sin asignar —'

export async function getUnassignedClient() {
  const existing = await prisma.client.findFirst({ where: { isSystem: true, fullName: UNASSIGNED_CLIENT_NAME } })
  if (existing) return existing
  return prisma.client.create({
    data: {
      fullName: UNASSIGNED_CLIENT_NAME,
      phones: [],
      deliveryAddress: '',
      zone: '',
      isSystem: true,
      notes: 'Cliente interno del sistema para productos sin dueño todavía. No borrar.',
    },
  })
}
