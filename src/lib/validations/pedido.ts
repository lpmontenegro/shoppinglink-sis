import { z } from 'zod'
import { clienteQuickSchema } from './cliente'

export const PURCHASE_TYPES = ['ADVANCE', 'COURIER'] as const
export const PACKING_METHODS = ['SUITCASE', 'BOX'] as const

// Un producto dentro del pedido. id presente = producto existente que se
// está editando; id ausente = producto nuevo que se agrega a un pedido
// (nuevo o existente).
export const orderItemSchema = z
  .object({
    id: z.string().trim().optional(),
    productName: z.string().trim().optional().nullable(),
    photoUrl: z.string().trim().optional().nullable(),
    productLink: z.string().trim().optional().nullable(),
    purchaseType: z.enum(PURCHASE_TYPES),
    costUsd: z.coerce.number().nonnegative().optional().nullable(),
    cost: z.coerce.number().nonnegative('El costo no puede ser negativo'),
    salePrice: z.coerce.number().nonnegative('El precio de venta no puede ser negativo'),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.purchaseType !== 'ADVANCE' || data.costUsd != null, {
    message: 'El costo en USD es requerido para compras anticipadas',
    path: ['costUsd'],
  })

export type OrderItemInput = z.infer<typeof orderItemSchema>

// clientId: cliente ya existente. newClient: alta rápida (viene de WhatsApp,
// solo nombre + teléfono) — el API crea el cliente y usa su id. Un pedido
// necesita al menos un producto.
export const pedidoSchema = z
  .object({
    clientId: z.string().trim().min(1).optional(),
    newClient: clienteQuickSchema.optional(),
    cycleId: z.string().trim().min(1, 'El ciclo es requerido'),
    notes: z.string().trim().optional().nullable(),
    items: z.array(orderItemSchema).min(1, 'Se necesita al menos un producto'),
  })
  .refine((data) => data.clientId || data.newClient, {
    message: 'Se necesita un cliente existente o los datos de un cliente nuevo',
    path: ['clientId'],
  })

export type PedidoInput = z.infer<typeof pedidoSchema>

export const orderItemStatusSchema = z.object({
  confirmed: z.boolean().optional(),
  packed: z.boolean().optional(),
  packedIn: z.enum(PACKING_METHODS).optional().nullable(),
  delivered: z.boolean().optional(),
  canceled: z.boolean().optional(),
  canceledReason: z.string().trim().optional().nullable(),
})

export type OrderItemStatusInput = z.infer<typeof orderItemStatusSchema>
