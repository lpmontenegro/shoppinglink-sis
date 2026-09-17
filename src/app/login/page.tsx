'use client'

import { useState, FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Email o contraseña incorrectos.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-lg shadow-sm border border-brand-gray"
      >
        <h1 className="text-xl font-bold text-brand-blue mb-4">Shopping Link</h1>

        {error && (
          <p className="mb-3 text-sm text-red-600">{error}</p>
        )}

        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 border border-brand-gray rounded"
          required
        />

        <label className="block text-sm mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-brand-gray rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-brand-blue text-white py-2 rounded font-medium"
        >
          Entrar
        </button>
      </form>
    </main>
  )
}
