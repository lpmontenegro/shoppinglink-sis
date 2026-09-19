import { prisma } from '@/lib/prisma'
import ClientesTable from '@/components/clientes/ClientesTable'

export default async function ClientesPage() {
  const clientes = await prisma.client.findMany({
    include: { pickupPlace: true },
    orderBy: { fullName: 'asc' },
  })

  return <ClientesTable clientes={clientes} />
}
