import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold text-brand-blue">Shopping Link</h1>
      <p className="mt-2 text-brand-gray-dk">
        Sesión activa: {session?.user?.email ?? 'ninguna'}
      </p>
      <p className="mt-4 text-sm text-brand-gray-dk">
        Esqueleto inicial — Sprint 1 agrega los módulos de Clientes, Ciclos y Pedidos.
      </p>
    </main>
  )
}
