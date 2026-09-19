import { z } from 'zod'

// deliveryAddress y zone quedan opcionales a propósito: un cliente puede
// crearse rápido desde Pedidos (viene de WhatsApp, solo se sabe nombre y
// teléfono) y completarse después desde la pantalla de Clientes.
export const clienteSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre es requerido'),
  phones: z
    .array(z.string().trim().min(1))
    .min(1, 'Se necesita al menos un teléfono'),
  deliveryAddress: z.string().trim().optional().default(''),
  zone: z.string().trim().optional().default(''),
  notes: z.string().trim().optional().nullable(),
  active: z.boolean().optional().default(true),
})

export type ClienteInput = z.infer<typeof clienteSchema>

// Para el alta rápida desde Pedidos: solo nombre + teléfono.
export const clienteQuickSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre es requerido'),
  phone: z.string().trim().min(1, 'El teléfono es requerido'),
})

export type ClienteQuickInput = z.infer<typeof clienteQuickSchema>
