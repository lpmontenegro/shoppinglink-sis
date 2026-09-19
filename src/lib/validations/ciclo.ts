import { z } from 'zod'

export const CYCLE_STATUSES = [
  'OPEN',
  'ORDERS_CLOSED',
  'TRAVELING',
  'PACKING',
  'DELIVERING',
  'DONE',
] as const

export const cicloSchema = z.object({
  code: z.string().trim().min(1, 'El código es requerido'),
  status: z.enum(CYCLE_STATUSES).optional().default('OPEN'),
  openDate: z.coerce.date({ errorMap: () => ({ message: 'Fecha de apertura inválida' }) }),
  closeDate: z.coerce.date().optional().nullable(),
  travelDepartDate: z.coerce.date().optional().nullable(),
  travelReturnDate: z.coerce.date().optional().nullable(),
  boxArrivalDate: z.coerce.date().optional().nullable(),
  usAddressId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  taxRate: z.coerce.number().min(0).max(100).optional().default(7.5),
  notes: z.string().trim().optional().nullable(),
})

export type CicloInput = z.infer<typeof cicloSchema>
