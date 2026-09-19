'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm text-brand-gray-dk hover:text-brand-black"
    >
      Salir
    </button>
  )
}
