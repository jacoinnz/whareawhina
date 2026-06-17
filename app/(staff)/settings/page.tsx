import { prisma } from '@/lib/prisma'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const brand = await prisma.brandSettings.findUnique({ where: { id: 'singleton' } })
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm brand={brand} />
    </div>
  )
}
