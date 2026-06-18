'use client'
import { useActionState } from 'react'
import { updateSettings } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BrandSettings } from '@prisma/client'

type Props = { brand: BrandSettings | null }

export function SettingsForm({ brand }: Props) {
  const [state, action, pending] = useActionState(
    async (_prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await updateSettings(formData)
      if (result.error) return { error: result.error }
      return { success: true }
    },
    null
  )

  return (
    <form action={action} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-700 border-b pb-2">Branding</h2>
        <div className="space-y-1">
          <Label htmlFor="companyName">Company Name</Label>
          <Input id="companyName" name="companyName" defaultValue={brand?.companyName ?? 'PCTECHNZ'} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="logo">Logo (PNG/JPG)</Label>
          <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
          {brand?.logoUrl && (
            <p className="text-xs text-gray-500">Current: <a href={brand.logoUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline">view logo</a></p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="primaryColor">Brand Colour</Label>
          <div className="flex items-center gap-3">
            <Input id="primaryColor" name="primaryColor" type="color" defaultValue={brand?.primaryColor ?? '#0066CC'} className="w-16 h-10 p-1 cursor-pointer" />
            <span className="text-sm text-gray-500">Used on proposal headers and emails</span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-gray-700 border-b pb-2">Contact Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={brand?.phone ?? ''} placeholder="09 123 4567" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={brand?.email ?? ''} placeholder="info@pctechnz.co.nz" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={brand?.website ?? ''} placeholder="www.pctechnz.co.nz" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="notifyEmail">Alert Email</Label>
            <Input id="notifyEmail" name="notifyEmail" type="email" defaultValue={brand?.notifyEmail ?? ''} placeholder="Receives accept/decline alerts" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={brand?.address ?? ''} placeholder="123 Main St, Auckland" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-gray-700 border-b pb-2">Default Terms</h2>
        <Textarea
          id="defaultTerms"
          name="defaultTerms"
          rows={5}
          defaultValue={brand?.defaultTerms ?? ''}
          placeholder="Pre-filled on all new quotes…"
        />
      </section>

      {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
      {state?.success && <p className="text-green-600 text-sm">Settings saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save Settings'}
      </Button>
    </form>
  )
}
