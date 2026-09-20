import { z } from 'zod'

export const STORE_VISIT_STATUSES = ['DRAFT', 'PUBLISHED', 'DONE'] as const

export const storeVisitSchema = z.object({
  cycleId: z.string().trim().min(1, 'El ciclo es requerido'),
  store: z.string().trim().min(1, 'La tienda es requerida'),
  visitDate: z.coerce.date().optional(),
  notes: z.string().trim().optional().nullable(),
})

export type StoreVisitInput = z.infer<typeof storeVisitSchema>

export const storeVisitUpdateSchema = z.object({
  store: z.string().trim().min(1).optional(),
  visitDate: z.coerce.date().optional(),
  notes: z.string().trim().optional().nullable(),
  status: z.enum(STORE_VISIT_STATUSES).optional(),
})

export const storeOfferItemSchema = z.object({
  photoUrl: z.string().trim().optional().nullable(),
  productName: z.string().trim().min(1, 'El nombre del producto es requerido'),
  costUsd: z.coerce.number().nonnegative('El costo no puede ser negativo'),
  finalPrice: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().optional().nullable(),
})

export type StoreOfferItemInput = z.infer<typeof storeOfferItemSchema>

export const storeOfferItemUpdateSchema = z.object({
  photoUrl: z.string().trim().optional().nullable(),
  productName: z.string().trim().min(1).optional(),
  costUsd: z.coerce.number().nonnegative().optional(),
  finalPrice: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().optional().nullable(),
  purchased: z.boolean().optional(),
})

export const storeOfferSelectionSchema = z.object({
  clientId: z.string().trim().min(1, 'El cliente es requerido'),
  quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a cero').default(1),
})

export type StoreOfferSelectionInput = z.infer<typeof storeOfferSelectionSchema>

export const storeOfferSelectionUpdateSchema = z.object({
  quantity: z.coerce.number().int().positive('La cantidad debe ser mayor a cero'),
})
