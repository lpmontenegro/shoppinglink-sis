import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Nav from '@/components/Nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <>
      <Nav email={session?.user?.email} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </>
  )
}
