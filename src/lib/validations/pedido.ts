import { z } from 'zod'
import { clienteQuickSchema } from './cliente'

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v)

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
    quantity: z.coerce.number().int().min(1, 'Mínimo 1').default(1),
    costUsd: z.coerce.number().nonnegative().optional().nullable(),
    // null/vacío = todavía sin definir (costo sin anotar / PRECIO PENDIENTE).
    cost: z.preprocess(emptyToNull, z.coerce.number().nonnegative('El costo no puede ser negativo').nullable()).optional(),
    salePrice: z.preprocess(
      emptyToNull,
      z.coerce.number().nonnegative('El precio de venta no puede ser negativo').nullable()
    ).optional(),
    store: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
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
  received: z.boolean().optional(),
  // problem=true: no se vende (dañado, equivocado...) → también queda
  // cancelado con el motivo en canceledReason. problem=false lo reactiva.
  problem: z.boolean().optional(),
})

// Cambios rápidos a un solo producto desde la pantalla Pendientes: fijar el
// precio y/o el costo, o pasarlo a otro cliente.
export const itemQuickUpdateSchema = z.object({
  salePrice: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable()).optional(),
  costUsd: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable()).optional(),
  productName: z.string().trim().min(1).optional(),
  quantity: z.coerce.number().int().min(1).optional(),
})

export const itemAssignSchema = z
  .object({
    clientId: z.string().trim().min(1).optional(),
    newClientName: z.string().trim().min(1).optional(),
  })
  .refine((d) => d.clientId || d.newClientName, { message: 'Elige un cliente', path: ['clientId'] })

export type OrderItemStatusInput = z.infer<typeof orderItemStatusSchema>
