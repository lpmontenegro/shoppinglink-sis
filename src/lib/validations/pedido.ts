import { z } from 'zod'
import { clienteQuickSchema } from './cliente'

export const PURCHASE_TYPES = ['ADVANCE', 'COURIER'] as const
export const PACKING_METHODS = ['SUITCASE', 'BOX'] as const

// clientId: cliente ya existente. newClient: alta rápida (viene de WhatsApp,
// solo nombre + teléfono) — el API crea el cliente y usa su id.
export const pedidoSchema = z
  .object({
    clientId: z.string().trim().min(1).optional(),
    newClient: clienteQuickSchema.optional(),
    cycleId: z.string().trim().min(1, 'El ciclo es requerido'),
    purchaseType: z.enum(PURCHASE_TYPES),
    productLink: z.string().trim().optional().nullable(),
    costUsd: z.coerce.number().nonnegative().optional().nullable(),
    cost: z.coerce.number().nonnegative('El costo no puede ser negativo'),
    salePrice: z.coerce.number().nonnegative('El precio de venta no puede ser negativo'),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.clientId || data.newClient, {
    message: 'Se necesita un cliente existente o los datos de un cliente nuevo',
    path: ['clientId'],
  })
  .refine((data) => data.purchaseType !== 'ADVANCE' || data.costUsd != null, {
    message: 'El costo en USD es requerido para compras anticipadas',
    path: ['costUsd'],
  })

export type PedidoInput = z.infer<typeof pedidoSchema>

export const pedidoStatusSchema = z.object({
  confirmed: z.boolean().optional(),
  packed: z.boolean().optional(),
  packedIn: z.enum(PACKING_METHODS).optional().nullable(),
  delivered: z.boolean().optional(),
  canceled: z.boolean().optional(),
  canceledReason: z.string().trim().optional().nullable(),
})

export type PedidoStatusInput = z.infer<typeof pedidoStatusSchema>
