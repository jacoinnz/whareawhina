import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'prisma/config'

loadEnvConfig(process.cwd(), true)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
