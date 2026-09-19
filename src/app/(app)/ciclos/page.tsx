import { prisma } from '@/lib/prisma'
import CiclosTable from '@/components/ciclos/CiclosTable'

export default async function CiclosPage() {
  const ciclos = await prisma.cycle.findMany({
    orderBy: { openDate: 'desc' },
  })

  return <CiclosTable ciclos={ciclos} />
}
