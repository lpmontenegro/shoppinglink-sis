import { z } from 'zod'

export const pickupPlaceSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().trim().optional().nullable(),
  address: z.string().trim().min(1, 'La dirección es requerida'),
  responsible: z.string().trim().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export type PickupPlaceInput = z.infer<typeof pickupPlaceSchema>
