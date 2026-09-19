import { prisma } from '@/lib/prisma'
import CiclosTable from '@/components/ciclos/CiclosTable'

export default async function CiclosPage() {
  const ciclos = await prisma.cycle.findMany({
    include: { usAddress: true },
    orderBy: { openDate: 'desc' },
  })

  // Prisma's Decimal no se puede pasar tal cual de un Server Component a un
  // Client Component — se convierte a number antes de bajarlo como prop.
  const plainCiclos = ciclos.map((c) => ({ ...c, taxRate: Number(c.taxRate) }))

  return <CiclosTable ciclos={plainCiclos} />
}
