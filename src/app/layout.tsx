import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shopping Link',
  description: 'Sistema de operaciones de Shopping Link',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-brand-gray-lt text-brand-black">{children}</body>
    </html>
  )
}
