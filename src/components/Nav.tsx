import Link from 'next/link'
import LogoutButton from './LogoutButton'
import ExchangeRateWidget from './ExchangeRateWidget'

export default function Nav({ email }: { email?: string | null }) {
  return (
    <header className="bg-white border-b border-brand-gray">
      <div className="max-w-6xl mx-auto px-6 min-h-14 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Link href="/" className="font-bold text-brand-blue whitespace-nowrap">
            Shopping Link
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm whitespace-nowrap">
            <Link href="/" className="text-brand-gray-dk hover:text-brand-black">
              Inicio
            </Link>
            <Link href="/clientes" className="text-brand-gray-dk hover:text-brand-black">
              Clientes
            </Link>
            <Link href="/ciclos" className="text-brand-gray-dk hover:text-brand-black">
              Ciclos
            </Link>
            <Link href="/pedidos" className="text-brand-gray-dk hover:text-brand-black">
              Pedidos
            </Link>
            <Link href="/empaque" className="text-brand-gray-dk hover:text-brand-black">
              Empaque
            </Link>
            <Link href="/recepcion" className="text-brand-gray-dk hover:text-brand-black">
              Recepción
            </Link>
            <Link href="/distribucion" className="text-brand-gray-dk hover:text-brand-black">
              Distribución
            </Link>
            <Link href="/tienda" className="text-brand-gray-dk hover:text-brand-black">
              Tienda
            </Link>
            <Link href="/finanzas" className="text-brand-gray-dk hover:text-brand-black">
              Finanzas
            </Link>
            <Link href="/pendientes" className="text-brand-gray-dk hover:text-brand-black">
              Pendientes
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ExchangeRateWidget />
          {email && <span className="text-sm text-brand-gray-dk">{email}</span>}
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
