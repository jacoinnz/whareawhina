import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.brandSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      companyName: 'PCTECHNZ',
      primaryColor: '#0066CC',
      defaultTerms:
        'This quote is valid for 30 days from the date of issue. ' +
        'All prices are in NZD and GST is additional unless stated otherwise. ' +
        'A 50% deposit is required to commence work.',
    },
  })

  const hashedPassword = await bcrypt.hash('changeme123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@pctechnz.co.nz' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@pctechnz.co.nz',
      hashedPassword,
    },
  })

  console.log('Seed complete.')
  console.log('Login: admin@pctechnz.co.nz (default password — change in /settings)')
  console.log('⚠️  Change this password in /settings after first login.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
