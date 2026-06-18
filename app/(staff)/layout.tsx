import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
