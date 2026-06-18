import type { BrandSettings } from '@prisma/client'

export function ProposalHeader({ brand }: { brand: BrandSettings }) {
  return (
    <div
      className="rounded-t-xl p-6 flex items-center justify-between"
      style={{ backgroundColor: brand.primaryColor }}
    >
      <div className="flex items-center gap-4">
        {brand.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logoUrl} alt={brand.companyName} width={48} height={48} className="rounded object-contain" />
        )}
        <div>
          <h1 className="text-white font-bold text-2xl">{brand.companyName}</h1>
          <p className="text-white/80 text-sm">
            {[brand.phone, brand.email, brand.website].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  )
}
