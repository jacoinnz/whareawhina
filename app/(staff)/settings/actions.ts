'use server'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { revalidatePath } from 'next/cache'

export async function updateSettings(formData: FormData): Promise<{ error?: string }> {
  const logoFile = formData.get('logo') as File | null

  let logoUrl: string | undefined

  if (logoFile && logoFile.size > 0) {
    try {
      const blob = await put(`logos/${Date.now()}-${logoFile.name}`, logoFile, {
        access: 'public',
      })
      logoUrl = blob.url
    } catch (err) {
      console.error('Logo upload failed:', err)
      return { error: 'Logo upload failed. Please try again.' }
    }
  }

  await prisma.brandSettings.upsert({
    where: { id: 'singleton' },
    update: {
      ...(logoUrl ? { logoUrl } : {}),
      primaryColor: (formData.get('primaryColor') as string) || '#0066CC',
      companyName: (formData.get('companyName') as string) || 'PCTECHNZ',
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      address: (formData.get('address') as string) || null,
      website: (formData.get('website') as string) || null,
      notifyEmail: (formData.get('notifyEmail') as string) || null,
      defaultTerms: (formData.get('defaultTerms') as string) || null,
    },
    create: {
      id: 'singleton',
      ...(logoUrl ? { logoUrl } : {}),
      primaryColor: (formData.get('primaryColor') as string) || '#0066CC',
      companyName: (formData.get('companyName') as string) || 'PCTECHNZ',
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      address: (formData.get('address') as string) || null,
      website: (formData.get('website') as string) || null,
      notifyEmail: (formData.get('notifyEmail') as string) || null,
      defaultTerms: (formData.get('defaultTerms') as string) || null,
    },
  })

  revalidatePath('/settings')
  return {}
}
