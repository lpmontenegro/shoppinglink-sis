import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storeOfferSelectionSchema } from '@/lib/validations/storeVisit'
import { getExchangeRate } from '@/lib/settings'

// Un cliente pide un producto ya ofrecido: se registra la selección y, al
// mismo tiempo, se crea (o se agrega a) el pedido real de ese cliente en el
// ciclo — así queda tanto en el "carrito" de la tienda (suma de selecciones)
// como en la lista de pedidos del cliente, listo para seguir el flujo normal
// de confirmar/empacar/entregar.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; offerId: string } }
) {
  const body = await req.json().catch(() => null)
  const parsed = storeOfferSelectionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const offer = await prisma.storeOfferItem.findUnique({
    where: { id: params.offerId },
    include: { storeVisit: true },
  })
  if (!offer || offer.storeVisitId !== params.id) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
  }
  if (offer.storeVisit.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: 'La visita debe estar publicada antes de tomar pedidos de clientes' },
      { status: 400 }
    )
  }

  const { clientId, quantity } = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      let order = await tx.order.findFirst({
        where: { clientId, cycleId: offer.storeVisit.cycleId },
      })
      if (!order) {
        const rate = await getExchangeRate()
        order = await tx.order.create({
          data: {
            clientId,
            cycleId: offer.storeVisit.cycleId,
            exchangeRate: rate,
            source: 'MANUAL',
          },
        })
      }

      const note = `Tienda: ${offer.storeVisit.store}${quantity > 1 ? ` · x${quantity}` : ''}`

      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          purchaseType: 'ADVANCE',
          productName: offer.productName,
          photoUrl: offer.photoUrl,
          costUsd: offer.costUsd,
          cost: offer.cost,
          salePrice: Number(offer.finalPrice) * quantity,
          notes: note,
        },
      })

      const selection = await tx.storeOfferSelection.create({
        data: {
          offerItemId: params.offerId,
          clientId,
          quantity,
          orderItemId: orderItem.id,
        },
        include: { client: true },
      })

      return selection
    })

    return NextResponse.json(result, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este cliente ya pidió este producto — edita la cantidad en vez de agregarlo de nuevo' },
        { status: 409 }
      )
    }
    throw e
  }
}
