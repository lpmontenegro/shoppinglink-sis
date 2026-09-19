import { z } from 'zod'

export const usAddressSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().trim().optional().nullable(),
  addressLine: z.string().trim().min(1, 'La dirección es requerida'),
  city: z.string().trim().min(1, 'La ciudad es requerida'),
  state: z.string().trim().min(1, 'El estado es requerido'),
  zip: z.string().trim().min(1, 'El código postal es requerido'),
  phone: z.string().trim().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export type UsAddressInput = z.infer<typeof usAddressSchema>
