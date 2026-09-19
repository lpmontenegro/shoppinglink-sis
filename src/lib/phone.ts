// Formato de teléfono estilo WhatsApp: código de país + número, con +502
// (Guatemala) como default. El teléfono se guarda como un solo string
// "+502 5555-1234" en Client.phones (String[]), así que estos helpers solo
// separan/unen el código para la UI.

export const COUNTRY_CODES = [
  { code: '+502', label: 'Guatemala (+502)' },
  { code: '+503', label: 'El Salvador (+503)' },
  { code: '+504', label: 'Honduras (+504)' },
  { code: '+505', label: 'Nicaragua (+505)' },
  { code: '+506', label: 'Costa Rica (+506)' },
  { code: '+507', label: 'Panamá (+507)' },
  { code: '+1', label: 'Estados Unidos / Canadá (+1)' },
  { code: '+52', label: 'México (+52)' },
]

export const DEFAULT_COUNTRY_CODE = '+502'

export function splitPhone(phone: string): { code: string; number: string } {
  const match = phone.trim().match(/^(\+\d{1,4})\s*(.*)$/)
  if (match) return { code: match[1], number: match[2] }
  return { code: DEFAULT_COUNTRY_CODE, number: phone.trim() }
}

export function joinPhone(code: string, number: string): string {
  const trimmedNumber = number.trim()
  return trimmedNumber ? `${code} ${trimmedNumber}` : ''
}
