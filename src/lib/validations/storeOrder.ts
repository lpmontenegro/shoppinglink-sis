import { z } from 'zod'

export const storeOrderSchema = z.object({
  cycleId: z.string().trim().min(1, 'El ciclo es requerido'),
  photoUrl: z.string().trim().optional().nullable(),
  productName: z.string().trim().min(1, 'El nombre del producto es requerido'),
  store: z.string().trim().min(1, 'La tienda es requerida'),
  costUsd: z.coerce.number().nonnegative('El costo no puede ser negativo'),
  finalPrice: z.coerce.number().nonnegative('El precio final no puede ser negativo'),
  storeLocationNote: z.string().trim().optional().nullable(),
  purchased: z.boolean().optional(),
})

export type StoreOrderInput = z.infer<typeof storeOrderSchema>

export const storeOrderClaimSchema = z.object({
  clientId: z.string().trim().min(1, 'El cliente es requerido'),
  quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a cero').default(1),
})

export type StoreOrderClaimInput = z.infer<typeof storeOrderClaimSchema>

export const storeOrderClaimUpdateSchema = z.object({
  quantity: z.coerce.number().int().positive().optional(),
  confirmed: z.boolean().optional(),
})
