import { NextRequest, NextResponse } from 'next/server'
import { getExchangeRate, setExchangeRate } from '@/lib/settings'

// Este endpoint siempre debe ejecutarse en request-time (nunca prerenderizado
// en build): sin esto, Next.js intenta generarlo como ruta estática durante
// `next build` y termina consultando la base de datos real (que no existe en
// build time), causando un error de conexión.
export const dynamic = 'force-dynamic'

export async function GET() {
  const rate = await getExchangeRate()
  return NextResponse.json({ rate })
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const rate = typeof body?.rate === 'number' ? body.rate : parseFloat(body?.rate)

  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: 'Tipo de cambio inválido' }, { status: 400 })
  }

  await setExchangeRate(rate)
  return NextResponse.json({ rate })
}
