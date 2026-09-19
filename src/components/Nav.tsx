import Link from 'next/link'
import LogoutButton from './LogoutButton'
import ExchangeRateWidget from './ExchangeRateWidget'

export default function Nav({ email }: { email?: string | null }) {
  return (
    <header className="bg-white border-b border-brand-gray">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-brand-blue">
            Shopping Link
          </Link>
          <nav className="flex items-center gap-4 text-sm">
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
