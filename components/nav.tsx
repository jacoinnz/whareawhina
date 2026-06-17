import Link from 'next/link'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export function Nav() {
  return (
    <nav className="border-b bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-blue-600 text-lg">PCTECHNZ</span>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <Link href="/quotes/new" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
            New Quote
          </Link>
          <Link href="/settings" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
            Settings
          </Link>
        </div>
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </nav>
  )
}
