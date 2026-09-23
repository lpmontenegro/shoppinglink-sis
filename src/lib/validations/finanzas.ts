import { z } from 'zod'

// Categorías de gasto del ciclo — coinciden con lo que ya se venía anotando
// en el schema (boletos aéreos, maletas, cajas, gastos de viaje, otros).
export const EXPENSE_TYPES = ['Boletos aéreos', 'Maletas', 'Cajas/courier', 'Gastos de viaje', 'Otros'] as const

export const cycleExpenseSchema = z.object({
  cycleId: z.string().trim().min(1, 'El ciclo es requerido'),
  type: z.enum(EXPENSE_TYPES),
  date: z.coerce.date(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  description: z.string().trim().optional().nullable(),
})

export type CycleExpenseInput = z.infer<typeof cycleExpenseSchema>

export const paymentSchema = z.object({
  clientId: z.string().trim().min(1, 'El cliente es requerido'),
  cycleId: z.string().trim().min(1, 'El ciclo es requerido'),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  paymentDate: z.coerce.date(),
  notes: z.string().trim().optional().nullable(),
})

export type PaymentInput = z.infer<typeof paymentSchema>
