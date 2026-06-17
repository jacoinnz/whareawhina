# PCTECHNZ Quotation Proposal System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Next.js 15 application for PCTECHNZ to create branded IT quotation proposals and send them to clients via a private token link where clients can accept or decline.

**Architecture:** Next.js 15 App Router with server components for data fetching and server actions for all mutations. Staff authenticate via NextAuth v5 JWT sessions protected by middleware. Clients access proposals via a unique `nanoid` token embedded in the URL — no login required. All data in Neon Postgres via Prisma.

**Tech Stack:** Next.js 15, TypeScript, NextAuth v5, Prisma, Neon Postgres, Resend, React Email, `@vercel/blob`, Tailwind CSS, shadcn/ui, Vitest, Playwright.

---

## File Map

```
app/
  api/auth/[...nextauth]/route.ts
  (staff)/layout.tsx                  ← auth guard + nav shell
  (staff)/dashboard/page.tsx
  (staff)/quotes/new/page.tsx
  (staff)/quotes/[id]/page.tsx
  (staff)/quotes/[id]/actions.ts      ← saveQuote, sendToClient, duplicateQuote
  (staff)/settings/page.tsx
  (staff)/settings/actions.ts         ← updateSettings, uploadLogo
  login/page.tsx
  login/actions.ts                    ← loginAction
  proposals/[token]/page.tsx
  proposals/[token]/actions.ts        ← acceptQuote, declineQuote
  proposals/[token]/done/page.tsx
  layout.tsx
  page.tsx                            ← redirect to /dashboard
components/
  quote-builder/
    line-items-table.tsx              ← editable rows, client component
    client-selector.tsx               ← combobox + inline create, client component
    totals-summary.tsx                ← live totals, client component
    quote-editor-form.tsx             ← full editor wrapper, client component
  proposal/
    proposal-header.tsx               ← branded header, server component
    proposal-line-items.tsx           ← read-only tables, server component
    proposal-actions.tsx              ← accept/decline buttons, client component
  dashboard/
    quote-table.tsx                   ← quote list with badges, server component
  nav.tsx                             ← staff nav, server component
emails/
  proposal-email.tsx
  response-alert-email.tsx
lib/
  prisma.ts
  auth.ts
  pricing.ts
  quotes.ts
  email.ts
middleware.ts
prisma/
  schema.prisma
  seed.ts
__tests__/lib/pricing.test.ts
__tests__/lib/quotes.test.ts
e2e/quote-flow.spec.ts
vitest.config.ts
playwright.config.ts
.env.example
```

---

## Task 1: Scaffold + Dependencies

**Files:**
- Create: all root config files

- [ ] **Step 1: Create Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias="@/*" --yes
```

Expected: Next.js 15 project created with `app/`, `public/`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install prisma @prisma/client next-auth@5 bcryptjs nanoid resend @react-email/components react-email @vercel/blob zod
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/jest-dom jsdom @playwright/test
```

- [ ] **Step 4: Install and initialise shadcn/ui**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button input label textarea badge card table select dialog toast separator
```

- [ ] **Step 5: Write vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 6: Write Playwright config**

Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 7: Add test scripts to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 8: Create .env.example**

```bash
cat > .env.example << 'EOF'
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
```

- [ ] **Step 9: Create .env.local from example**

```bash
cp .env.example .env.local
```

Then fill in real values from Neon (DATABASE_URL), `openssl rand -base64 32` (AUTH_SECRET), and Resend dashboard (RESEND_API_KEY). BLOB_READ_WRITE_TOKEN comes from Vercel after Task 17.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 project with all dependencies"
```

---

## Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write schema**

Replace the contents of `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String   @id @default(cuid())
  name           String
  email          String   @unique
  hashedPassword String
  quotes         Quote[]
  createdAt      DateTime @default(now())
}

model Client {
  id          String   @id @default(cuid())
  name        String
  contactName String
  email       String
  phone       String?
  address     String?
  quotes      Quote[]
  createdAt   DateTime @default(now())
}

model Quote {
  id          String      @id @default(cuid())
  quoteNumber String      @unique
  title       String
  status      QuoteStatus @default(DRAFT)
  token       String      @unique
  notes       String?
  terms       String?
  sentAt      DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  client      Client      @relation(fields: [clientId], references: [id])
  clientId    String
  author      User        @relation(fields: [authorId], references: [id])
  authorId    String
  lineItems   LineItem[]
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  DECLINED
}

model LineItem {
  id          String       @id @default(cuid())
  type        LineItemType
  description String
  quantity    Decimal      @db.Decimal(10, 2)
  unitPrice   Decimal      @db.Decimal(10, 2)
  sortOrder   Int          @default(0)
  quote       Quote        @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  quoteId     String
}

enum LineItemType {
  ONE_OFF
  RECURRING
}

model BrandSettings {
  id           String  @id @default("singleton")
  logoUrl      String?
  primaryColor String  @default("#0066CC")
  companyName  String  @default("PCTECHNZ")
  phone        String?
  email        String?
  address      String?
  website      String?
  notifyEmail  String?
  defaultTerms String?
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration applied, `prisma/migrations/` directory created, Prisma Client generated.

- [ ] **Step 4: Write seed script**

Create `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
  console.log('Login: admin@pctechnz.co.nz / changeme123')
  console.log('⚠️  Change this password in /settings after first login.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 5: Add seed config to package.json**

In `package.json` add at the top level:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

Install `tsx`:
```bash
npm install -D tsx
```

- [ ] **Step 6: Run seed**

```bash
npx prisma db seed
```

Expected output:
```
Seed complete.
Login: admin@pctechnz.co.nz / changeme123
⚠️  Change this password in /settings after first login.
```

- [ ] **Step 7: Verify in Prisma Studio (optional)**

```bash
npx prisma studio
```

Check that `BrandSettings` and `User` rows exist. Close when done.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with all models and seed data"
```

---

## Task 3: Auth Setup (NextAuth v5 + Login)

**Files:**
- Create: `lib/prisma.ts`
- Create: `lib/auth.ts`
- Create: `middleware.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`

- [ ] **Step 1: Create Prisma singleton**

Create `lib/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create NextAuth config**

Create `lib/auth.ts`:
```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null

        const valid = await bcrypt.compare(parsed.data.password, user.hashedPassword)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
})
```

- [ ] **Step 3: Create NextAuth route handler**

Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: Create middleware**

Create `middleware.ts`:
```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const path = req.nextUrl.pathname
  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/proposals') ||
    path.startsWith('/api/auth')

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  if (isLoggedIn && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 5: Create login server action**

Create `app/login/actions.ts`:
```typescript
'use server'
import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    })
    return null
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: 'Invalid email or password.' }
    }
    throw err // re-throw NEXT_REDIRECT
  }
}
```

- [ ] **Step 6: Create login page**

Create `app/login/page.tsx`:
```typescript
'use client'
import { useActionState } from 'react'
import { loginAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-600">PCTECHNZ</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage quotes</p>
        </div>
        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Verify login works**

```bash
npm run dev
```

Navigate to `http://localhost:3000/login`. Sign in with `admin@pctechnz.co.nz` / `changeme123`. Should redirect to `/dashboard` (which doesn't exist yet, so a 404 is expected). Confirm redirect happens.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth v5 authentication with login page"
```

---

## Task 4: Pricing Utility (TDD)

**Files:**
- Create: `lib/pricing.ts`
- Create: `__tests__/lib/pricing.test.ts`

- [ ] **Step 1: Create test directory**

```bash
mkdir -p __tests__/lib
```

- [ ] **Step 2: Write failing tests**

Create `__tests__/lib/pricing.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  lineItemTotal,
  subtotal,
  gst,
  totalWithGst,
  formatCurrency,
  GST_RATE,
} from '@/lib/pricing'

describe('GST_RATE', () => {
  it('is 0.15', () => {
    expect(GST_RATE).toBe(0.15)
  })
})

describe('lineItemTotal', () => {
  it('multiplies quantity by unit price', () => {
    expect(lineItemTotal({ quantity: 3, unitPrice: 100 })).toBe(300)
  })
  it('handles decimal quantities', () => {
    expect(lineItemTotal({ quantity: 1.5, unitPrice: 200 })).toBe(300)
  })
  it('returns 0 when quantity is 0', () => {
    expect(lineItemTotal({ quantity: 0, unitPrice: 999 })).toBe(0)
  })
})

describe('subtotal', () => {
  it('sums all line item totals', () => {
    const items = [
      { quantity: 2, unitPrice: 100 },
      { quantity: 1, unitPrice: 500 },
    ]
    expect(subtotal(items)).toBe(700)
  })
  it('returns 0 for empty array', () => {
    expect(subtotal([])).toBe(0)
  })
})

describe('gst', () => {
  it('calculates 15% of the amount', () => {
    expect(gst(1000)).toBe(150)
  })
  it('handles fractional amounts', () => {
    expect(gst(100.5)).toBeCloseTo(15.075)
  })
})

describe('totalWithGst', () => {
  it('adds 15% GST to the amount', () => {
    expect(totalWithGst(1000)).toBe(1150)
  })
})

describe('formatCurrency', () => {
  it('formats as NZD with two decimal places', () => {
    const formatted = formatCurrency(1234.5)
    expect(formatted).toContain('1,234.50')
  })
  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toContain('0.00')
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npm test -- __tests__/lib/pricing.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/pricing'`

- [ ] **Step 4: Implement pricing utility**

Create `lib/pricing.ts`:
```typescript
export const GST_RATE = 0.15

export type LineItemInput = {
  quantity: number
  unitPrice: number
}

export function lineItemTotal(item: LineItemInput): number {
  return item.quantity * item.unitPrice
}

export function subtotal(items: LineItemInput[]): number {
  return items.reduce((sum, item) => sum + lineItemTotal(item), 0)
}

export function gst(amount: number): number {
  return amount * GST_RATE
}

export function totalWithGst(amount: number): number {
  return amount + gst(amount)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(amount)
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test -- __tests__/lib/pricing.test.ts
```

Expected: All 9 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/pricing.ts __tests__/lib/pricing.test.ts
git commit -m "feat: add pricing utility with GST calculations (TDD)"
```

---

## Task 5: Quote Utility (TDD)

**Files:**
- Create: `lib/quotes.ts`
- Create: `__tests__/lib/quotes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/quotes.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateToken, formatQuoteNumber } from '@/lib/quotes'

describe('generateToken', () => {
  it('returns a string of 24 characters', () => {
    expect(generateToken()).toHaveLength(24)
  })
  it('returns URL-safe characters only', () => {
    const token = generateToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })
  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateToken()))
    expect(tokens.size).toBe(200)
  })
})

describe('formatQuoteNumber', () => {
  it('pads to 4 digits with PCT- prefix', () => {
    expect(formatQuoteNumber(1)).toBe('PCT-0001')
    expect(formatQuoteNumber(42)).toBe('PCT-0042')
    expect(formatQuoteNumber(1000)).toBe('PCT-1000')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- __tests__/lib/quotes.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/quotes'`

- [ ] **Step 3: Implement quotes utility**

Create `lib/quotes.ts`:
```typescript
import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'

export function generateToken(): string {
  return nanoid(24)
}

export function formatQuoteNumber(n: number): string {
  return `PCT-${String(n).padStart(4, '0')}`
}

export async function nextQuoteNumber(): Promise<string> {
  const count = await prisma.quote.count()
  return formatQuoteNumber(count + 1)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- __tests__/lib/quotes.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/quotes.ts __tests__/lib/quotes.test.ts
git commit -m "feat: add quote number and token generation utilities (TDD)"
```

---

## Task 6: App Shell (Layouts + Nav)

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `components/nav.tsx`
- Create: `app/(staff)/layout.tsx`

- [ ] **Step 1: Update root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PCTECHNZ Quoting',
  description: 'IT quotation proposal system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create root page redirect**

Create `app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'
export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 3: Create nav component**

Create `components/nav.tsx`:
```typescript
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
```

- [ ] **Step 4: Create staff layout**

Create `app/(staff)/layout.tsx`:
```typescript
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
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add app shell with nav and staff layout"
```

---

## Task 7: Dashboard Page

**Files:**
- Create: `components/dashboard/quote-table.tsx`
- Create: `app/(staff)/dashboard/page.tsx`

- [ ] **Step 1: Create status badge helper**

Add to `components/dashboard/quote-table.tsx`:
```typescript
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Quote, Client } from '@prisma/client'

type QuoteRow = Quote & { client: Client }

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

export function QuoteTable({ quotes }: { quotes: QuoteRow[] }) {
  if (quotes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">No quotes yet.</p>
        <Link href="/quotes/new">
          <Button className="mt-4">Create your first quote</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Quote #</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {quotes.map((q) => (
            <tr key={q.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono text-blue-600">{q.quoteNumber}</td>
              <td className="px-4 py-3">{q.title}</td>
              <td className="px-4 py-3">{q.client.name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={q.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(q.createdAt).toLocaleDateString('en-NZ')}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/quotes/${q.id}`}>
                  <Button variant="ghost" size="sm">View</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create dashboard page**

Create `app/(staff)/dashboard/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { QuoteTable } from '@/components/dashboard/quote-table'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const session = await auth()
  const quotes = await prisma.quote.findMany({
    where: { authorId: session!.user.id },
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Link href="/quotes/new">
          <Button>+ New Quote</Button>
        </Link>
      </div>
      <QuoteTable quotes={quotes} />
    </div>
  )
}
```

- [ ] **Step 3: Verify dashboard renders**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Should see "No quotes yet" with a create button.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add dashboard with quote list"
```

---

## Task 8: Quote Builder Components

**Files:**
- Create: `components/quote-builder/line-items-table.tsx`
- Create: `components/quote-builder/client-selector.tsx`
- Create: `components/quote-builder/totals-summary.tsx`
- Create: `components/quote-builder/quote-editor-form.tsx`

- [ ] **Step 1: Create line items table**

Create `components/quote-builder/line-items-table.tsx`:
```typescript
'use client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency, lineItemTotal } from '@/lib/pricing'

export type LineItemData = {
  id?: string
  description: string
  quantity: number
  unitPrice: number
}

type Props = {
  typeLabel: string
  items: LineItemData[]
  onChange: (items: LineItemData[]) => void
  readOnly?: boolean
}

export function LineItemsTable({ typeLabel, items, onChange, readOnly }: Props) {
  function update(index: number, field: keyof LineItemData, raw: string) {
    const value = field === 'description' ? raw : (parseFloat(raw) || 0)
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    onChange(updated)
  }

  function addRow() {
    onChange([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-700">{typeLabel}</h3>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-20">Qty</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Unit Price</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Total</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span>{item.description}</span>
                  ) : (
                    <Input
                      value={item.description}
                      onChange={(e) => update(i, 'description', e.target.value)}
                      className="h-8 border-0 shadow-none focus-visible:ring-1"
                      placeholder="Description"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="block text-right">{item.quantity}</span>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => update(i, 'quantity', e.target.value)}
                      className="h-8 text-right border-0 shadow-none focus-visible:ring-1"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    <span className="block text-right">{formatCurrency(item.unitPrice)}</span>
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => update(i, 'unitPrice', e.target.value)}
                      className="h-8 text-right border-0 shadow-none focus-visible:ring-1"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5 text-right font-medium">
                  {formatCurrency(lineItemTotal(item))}
                </td>
                {!readOnly && (
                  <td className="px-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(i)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    >
                      ×
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="px-3 py-4 text-center text-gray-400 text-sm">
                  No items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add Row
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create totals summary**

Create `components/quote-builder/totals-summary.tsx`:
```typescript
'use client'
import { subtotal, gst, totalWithGst, formatCurrency } from '@/lib/pricing'
import type { LineItemData } from './line-items-table'

type Props = {
  oneOffItems: LineItemData[]
  recurringItems: LineItemData[]
}

function TotalsBlock({
  label,
  items,
  perSuffix,
}: {
  label: string
  items: LineItemData[]
  perSuffix?: string
}) {
  const sub = subtotal(items)
  const gstAmount = gst(sub)
  const total = totalWithGst(sub)
  const suffix = perSuffix ?? ''

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      <div className="flex justify-between text-gray-600">
        <span>Subtotal</span>
        <span>{formatCurrency(sub)}{suffix}</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>GST (15%)</span>
        <span>{formatCurrency(gstAmount)}{suffix}</span>
      </div>
      <div className="flex justify-between font-semibold border-t pt-1 mt-1">
        <span>Total</span>
        <span>{formatCurrency(total)}{suffix}</span>
      </div>
    </div>
  )
}

export function TotalsSummary({ oneOffItems, recurringItems }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <TotalsBlock label="One-off Total" items={oneOffItems} />
      <TotalsBlock label="Monthly Recurring" items={recurringItems} perSuffix="/mo" />
    </div>
  )
}
```

- [ ] **Step 3: Create client selector**

Create `components/quote-builder/client-selector.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Client } from '@prisma/client'

type NewClientFields = {
  name: string
  contactName: string
  email: string
  phone: string
  address: string
}

type Props = {
  clients: Client[]
  selectedClientId: string
  onClientIdChange: (id: string) => void
  newClient: NewClientFields | null
  onNewClientChange: (fields: NewClientFields | null) => void
}

export function ClientSelector({
  clients,
  selectedClientId,
  onClientIdChange,
  newClient,
  onNewClientChange,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'new'>(
    selectedClientId ? 'existing' : 'new'
  )

  function startNew() {
    setMode('new')
    onClientIdChange('')
    onNewClientChange({ name: '', contactName: '', email: '', phone: '', address: '' })
  }

  function selectExisting(id: string) {
    setMode('existing')
    onClientIdChange(id)
    onNewClientChange(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label>Client</Label>
        {mode === 'existing' && (
          <button type="button" onClick={startNew} className="text-xs text-blue-600 hover:underline">
            + New client
          </button>
        )}
      </div>

      {mode === 'existing' ? (
        <Select value={selectedClientId} onValueChange={selectExisting}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client…" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — {c.contactName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="border rounded-lg p-4 space-y-3 bg-blue-50">
          <p className="text-sm font-medium text-blue-700">New client</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Company name *</Label>
              <Input
                value={newClient?.name ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, name: e.target.value })}
                placeholder="Whareawhina Ltd"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact name *</Label>
              <Input
                value={newClient?.contactName ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, contactName: e.target.value })}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={newClient?.email ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, email: e.target.value })}
                placeholder="jane@example.co.nz"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={newClient?.phone ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, phone: e.target.value })}
                placeholder="09 123 4567"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Address</Label>
              <Input
                value={newClient?.address ?? ''}
                onChange={(e) => onNewClientChange({ ...newClient!, address: e.target.value })}
                placeholder="123 Main St, Auckland"
              />
            </div>
          </div>
          {clients.length > 0 && (
            <button
              type="button"
              onClick={() => { setMode('existing'); onNewClientChange(null) }}
              className="text-xs text-blue-600 hover:underline"
            >
              ← Select existing client instead
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create quote editor form wrapper**

Create `components/quote-builder/quote-editor-form.tsx`:
```typescript
'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LineItemsTable } from './line-items-table'
import type { LineItemData } from './line-items-table'
import { TotalsSummary } from './totals-summary'
import { ClientSelector } from './client-selector'
import type { Quote, Client, LineItem, QuoteStatus } from '@prisma/client'
import { saveQuote, sendToClient, duplicateQuote } from '@/app/(staff)/quotes/[id]/actions'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

type QuoteWithRelations = Quote & {
  client: Client
  lineItems: LineItem[]
}

function toLineItemData(item: LineItem): LineItemData {
  return {
    id: item.id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  }
}

type Props = {
  quote: QuoteWithRelations
  clients: Client[]
}

const READ_ONLY_STATUSES: QuoteStatus[] = ['SENT', 'ACCEPTED', 'DECLINED']

export function QuoteEditorForm({ quote, clients }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const readOnly = READ_ONLY_STATUSES.includes(quote.status)

  const [title, setTitle] = useState(quote.title)
  const [notes, setNotes] = useState(quote.notes ?? '')
  const [terms, setTerms] = useState(quote.terms ?? '')
  const [clientId, setClientId] = useState(quote.clientId)
  const [newClient, setNewClient] = useState<{
    name: string; contactName: string; email: string; phone: string; address: string
  } | null>(null)

  const [oneOffItems, setOneOffItems] = useState<LineItemData[]>(
    quote.lineItems.filter((i) => i.type === 'ONE_OFF').map(toLineItemData)
  )
  const [recurringItems, setRecurringItems] = useState<LineItemData[]>(
    quote.lineItems.filter((i) => i.type === 'RECURRING').map(toLineItemData)
  )

  function handleSave() {
    startTransition(async () => {
      const result = await saveQuote({
        id: quote.id,
        title,
        notes,
        terms,
        clientId: clientId || null,
        newClient,
        oneOffItems,
        recurringItems,
      })
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Saved', description: 'Quote saved successfully.' })
        router.refresh()
      }
    })
  }

  function handleSend() {
    startTransition(async () => {
      const result = await sendToClient(quote.id)
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Sent', description: 'Proposal emailed to client.' })
        router.refresh()
      }
    })
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateQuote(quote.id)
      if (result.newId) {
        toast({ title: 'Duplicated', description: 'New draft created.' })
        router.push(`/quotes/${result.newId}`)
      }
    })
  }

  const proposalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${quote.token}`

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Quote Number</Label>
            <Input value={quote.quoteNumber} readOnly className="bg-gray-50 font-mono" />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input value={new Date(quote.createdAt).toLocaleDateString('en-NZ')} readOnly className="bg-gray-50" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={readOnly}
            placeholder="IT System Upgrade for Whareawhina"
          />
        </div>
        <ClientSelector
          clients={clients}
          selectedClientId={clientId}
          onClientIdChange={setClientId}
          newClient={newClient}
          onNewClientChange={setNewClient}
        />
        <div className="space-y-1">
          <Label htmlFor="notes">Scope / Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            readOnly={readOnly}
            rows={4}
            placeholder="Describe the scope of work or any relevant notes…"
          />
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <LineItemsTable
          typeLabel="One-off Costs (hardware, project work, software)"
          items={oneOffItems}
          onChange={setOneOffItems}
          readOnly={readOnly}
        />
        <LineItemsTable
          typeLabel="Monthly Recurring (managed services, licensing, support)"
          items={recurringItems}
          onChange={setRecurringItems}
          readOnly={readOnly}
        />
        <TotalsSummary oneOffItems={oneOffItems} recurringItems={recurringItems} />
      </div>

      {/* Footer */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="space-y-1">
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea
            id="terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            readOnly={readOnly}
            rows={4}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            quote.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
            quote.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
            quote.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {quote.status}
          </span>

          {quote.status === 'DRAFT' && (
            <>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Draft'}
              </Button>
              <Button onClick={handleSend} variant="default" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                {isPending ? 'Sending…' : 'Send to Client'}
              </Button>
            </>
          )}

          {quote.status !== 'DRAFT' && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(proposalUrl)}
              className="text-sm text-blue-600 hover:underline"
            >
              Copy proposal link
            </button>
          )}

          <Button variant="outline" onClick={handleDuplicate} disabled={isPending}>
            Duplicate
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add quote builder components (line items, client selector, totals)"
```

---

## Task 9: Quote Pages + Save/Create Actions

**Files:**
- Create: `app/(staff)/quotes/[id]/actions.ts`
- Create: `app/(staff)/quotes/[id]/page.tsx`
- Create: `app/(staff)/quotes/new/page.tsx`

- [ ] **Step 1: Create quote CRUD actions**

Create `app/(staff)/quotes/[id]/actions.ts`:
```typescript
'use server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { nextQuoteNumber, generateToken } from '@/lib/quotes'
import { revalidatePath } from 'next/cache'
import type { LineItemData } from '@/components/quote-builder/line-items-table'

type SaveQuoteInput = {
  id: string
  title: string
  notes: string
  terms: string
  clientId: string | null
  newClient: { name: string; contactName: string; email: string; phone: string; address: string } | null
  oneOffItems: LineItemData[]
  recurringItems: LineItemData[]
}

export async function saveQuote(input: SaveQuoteInput): Promise<{ error?: string }> {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const quote = await prisma.quote.findUnique({ where: { id: input.id } })
  if (!quote || quote.authorId !== session.user.id) return { error: 'Not found' }
  if (quote.status !== 'DRAFT') return { error: 'Only draft quotes can be edited' }

  let clientId = input.clientId

  if (input.newClient) {
    const { name, contactName, email, phone, address } = input.newClient
    if (!name || !contactName || !email) return { error: 'Client name, contact name, and email are required' }
    const client = await prisma.client.create({
      data: { name, contactName, email, phone: phone || null, address: address || null },
    })
    clientId = client.id
  }

  if (!clientId) return { error: 'Please select or create a client' }
  if (!input.title.trim()) return { error: 'Title is required' }

  const allItems = [
    ...input.oneOffItems.map((item, i) => ({ ...item, type: 'ONE_OFF' as const, sortOrder: i })),
    ...input.recurringItems.map((item, i) => ({ ...item, type: 'RECURRING' as const, sortOrder: i })),
  ]

  await prisma.$transaction([
    prisma.lineItem.deleteMany({ where: { quoteId: input.id } }),
    prisma.quote.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        notes: input.notes.trim() || null,
        terms: input.terms.trim() || null,
        clientId,
        lineItems: {
          create: allItems.map(({ id: _id, ...item }) => ({
            ...item,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
    }),
  ])

  revalidatePath(`/quotes/${input.id}`)
  revalidatePath('/dashboard')
  return {}
}

export async function sendToClient(quoteId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { client: true },
  })
  if (!quote || quote.authorId !== session.user.id) return { error: 'Not found' }
  if (quote.status !== 'DRAFT') return { error: 'Quote already sent' }

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'SENT', sentAt: new Date() },
  })

  // Email is sent in Task 10 — add here after that task is done
  revalidatePath(`/quotes/${quoteId}`)
  revalidatePath('/dashboard')
  return {}
}

export async function duplicateQuote(quoteId: string): Promise<{ newId?: string; error?: string }> {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const original = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lineItems: true },
  })
  if (!original || original.authorId !== session.user.id) return { error: 'Not found' }

  const quoteNumber = await nextQuoteNumber()
  const token = generateToken()

  const newQuote = await prisma.quote.create({
    data: {
      quoteNumber,
      title: `${original.title} (copy)`,
      status: 'DRAFT',
      token,
      notes: original.notes,
      terms: original.terms,
      clientId: original.clientId,
      authorId: session.user.id,
      lineItems: {
        create: original.lineItems.map(({ id: _id, quoteId: _qid, ...item }) => item),
      },
    },
  })

  revalidatePath('/dashboard')
  return { newId: newQuote.id }
}
```

- [ ] **Step 2: Create quote editor page**

Create `app/(staff)/quotes/[id]/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { QuoteEditorForm } from '@/components/quote-builder/quote-editor-form'

type Props = { params: Promise<{ id: string }> }

export default async function QuoteEditorPage({ params }: Props) {
  const { id } = await params
  const session = await auth()

  const [quote, clients] = await Promise.all([
    prisma.quote.findUnique({
      where: { id },
      include: { client: true, lineItems: { orderBy: { sortOrder: 'asc' } } },
    }),
    prisma.client.findMany({ orderBy: { name: 'asc' } }),
  ])

  if (!quote || quote.authorId !== session!.user.id) notFound()

  return (
    <div className="max-w-4xl space-y-2">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
      </div>
      <QuoteEditorForm quote={quote} clients={clients} />
    </div>
  )
}
```

- [ ] **Step 3: Create new quote page**

Create `app/(staff)/quotes/new/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { nextQuoteNumber, generateToken } from '@/lib/quotes'
import { redirect } from 'next/navigation'

export default async function NewQuotePage() {
  const session = await auth()

  const brand = await prisma.brandSettings.findUnique({ where: { id: 'singleton' } })

  const quoteNumber = await nextQuoteNumber()
  const token = generateToken()

  // Create a placeholder client if none exist, otherwise we need at least one
  // Pick the first client or use a placeholder that the user will fill in
  const firstClient = await prisma.client.findFirst({ orderBy: { createdAt: 'asc' } })

  // We need a clientId to create the quote — use first client or create a temporary one
  let clientId: string
  if (firstClient) {
    clientId = firstClient.id
  } else {
    const placeholder = await prisma.client.create({
      data: {
        name: 'New Client',
        contactName: 'Contact Name',
        email: 'client@example.com',
      },
    })
    clientId = placeholder.id
  }

  const quote = await prisma.quote.create({
    data: {
      quoteNumber,
      title: 'New Quote',
      status: 'DRAFT',
      token,
      terms: brand?.defaultTerms ?? null,
      clientId,
      authorId: session!.user.id,
    },
  })

  redirect(`/quotes/${quote.id}`)
}
```

- [ ] **Step 4: Verify quote creation flow**

```bash
npm run dev
```

Navigate to `/quotes/new`. Should redirect to `/quotes/[new-id]`. The editor should appear with empty fields. Try adding line items and saving.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add quote editor page and CRUD server actions"
```

---

## Task 10: Send to Client + Proposal Email

**Files:**
- Create: `lib/email.ts`
- Create: `emails/proposal-email.tsx`
- Modify: `app/(staff)/quotes/[id]/actions.ts` (wire in email send)

- [ ] **Step 1: Create email lib**

Create `lib/email.ts`:
```typescript
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { ProposalEmail } from '@/emails/proposal-email'
import { ResponseAlertEmail } from '@/emails/response-alert-email'

const resend = new Resend(process.env.RESEND_API_KEY)

type SendProposalArgs = {
  to: string
  clientName: string
  quoteNumber: string
  quoteTitle: string
  proposalUrl: string
  companyName: string
  primaryColor: string
}

type SendAlertArgs = {
  to: string
  clientName: string
  quoteNumber: string
  quoteTitle: string
  quoteUrl: string
  accepted: boolean
  companyName: string
}

export async function sendProposalEmail(args: SendProposalArgs) {
  const html = await render(ProposalEmail(args))
  return resend.emails.send({
    from: `${args.companyName} <quotes@pctechnz.co.nz>`,
    to: args.to,
    subject: `Your IT Proposal from ${args.companyName} — ${args.quoteNumber}`,
    html,
  })
}

export async function sendResponseAlertEmail(args: SendAlertArgs) {
  const html = await render(ResponseAlertEmail(args))
  const verb = args.accepted ? 'ACCEPTED' : 'DECLINED'
  return resend.emails.send({
    from: `${args.companyName} <noreply@pctechnz.co.nz>`,
    to: args.to,
    subject: `${args.accepted ? '✓' : '✗'} ${args.clientName} has ${verb} quote ${args.quoteNumber}`,
    html,
  })
}
```

- [ ] **Step 2: Create proposal email template**

Create `emails/proposal-email.tsx`:
```typescript
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview,
  Section, Text,
} from '@react-email/components'

type Props = {
  clientName: string
  quoteNumber: string
  quoteTitle: string
  proposalUrl: string
  companyName: string
  primaryColor: string
}

export function ProposalEmail({
  clientName,
  quoteNumber,
  quoteTitle,
  proposalUrl,
  companyName,
  primaryColor,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your IT proposal {quoteNumber} from {companyName}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ backgroundColor: primaryColor, padding: '24px', borderRadius: '8px 8px 0 0' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '24px' }}>
              {companyName}
            </Heading>
          </Section>
          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
            <Heading as="h2" style={{ color: '#111827', fontSize: '20px' }}>
              Hi {clientName},
            </Heading>
            <Text style={{ color: '#374151', lineHeight: '1.6' }}>
              Please find your IT proposal below. Click the button to review and accept or decline.
            </Text>
            <Text style={{ color: '#374151' }}>
              <strong>Quote:</strong> {quoteNumber}<br />
              <strong>Title:</strong> {quoteTitle}
            </Text>
            <Button
              href={proposalUrl}
              style={{
                backgroundColor: primaryColor,
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
                marginTop: '16px',
              }}
            >
              View Proposal
            </Button>
            <Hr style={{ margin: '32px 0', borderColor: '#e5e7eb' }} />
            <Text style={{ color: '#9ca3af', fontSize: '12px' }}>
              {companyName} · This link is unique to you. Please do not share it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ProposalEmail
```

- [ ] **Step 3: Wire email into sendToClient action**

In `app/(staff)/quotes/[id]/actions.ts`, replace the `sendToClient` function:
```typescript
export async function sendToClient(quoteId: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { client: true },
  })
  if (!quote || quote.authorId !== session.user.id) return { error: 'Not found' }
  if (quote.status !== 'DRAFT') return { error: 'Quote already sent' }

  const brand = await prisma.brandSettings.findUnique({ where: { id: 'singleton' } })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  await prisma.quote.update({
    where: { id: quoteId },
    data: { status: 'SENT', sentAt: new Date() },
  })

  try {
    await sendProposalEmail({
      to: quote.client.email,
      clientName: quote.client.name,
      quoteNumber: quote.quoteNumber,
      quoteTitle: quote.title,
      proposalUrl: `${appUrl}/proposals/${quote.token}`,
      companyName: brand?.companyName ?? 'PCTECHNZ',
      primaryColor: brand?.primaryColor ?? '#0066CC',
    })
  } catch (err) {
    console.error('Failed to send proposal email:', err)
    // Don't block — status is already SENT
  }

  revalidatePath(`/quotes/${quoteId}`)
  revalidatePath('/dashboard')
  return {}
}
```

Also add this import at the top of the actions file:
```typescript
import { sendProposalEmail } from '@/lib/email'
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Resend email integration and proposal email template"
```

---

## Task 11: Client Proposal View + Accept/Decline

**Files:**
- Create: `components/proposal/proposal-header.tsx`
- Create: `components/proposal/proposal-line-items.tsx`
- Create: `components/proposal/proposal-actions.tsx`
- Create: `app/proposals/[token]/page.tsx`
- Create: `app/proposals/[token]/actions.ts`

- [ ] **Step 1: Create branded proposal header**

Create `components/proposal/proposal-header.tsx`:
```typescript
import Image from 'next/image'
import type { BrandSettings } from '@prisma/client'

export function ProposalHeader({ brand }: { brand: BrandSettings }) {
  return (
    <div
      className="rounded-t-xl p-6 flex items-center justify-between"
      style={{ backgroundColor: brand.primaryColor }}
    >
      <div className="flex items-center gap-4">
        {brand.logoUrl && (
          <Image src={brand.logoUrl} alt={brand.companyName} width={48} height={48} className="rounded" />
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
```

- [ ] **Step 2: Create read-only line items component**

Create `components/proposal/proposal-line-items.tsx`:
```typescript
import type { LineItem } from '@prisma/client'
import { subtotal, gst, totalWithGst, formatCurrency, lineItemTotal } from '@/lib/pricing'

function LineTable({
  title,
  items,
  perSuffix,
}: {
  title: string
  items: LineItem[]
  perSuffix?: string
}) {
  const sub = subtotal(items.map(i => ({ quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })))
  const gstAmount = gst(sub)
  const total = totalWithGst(sub)
  const suffix = perSuffix ?? ''

  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-sm">{title}</h3>
      <table className="w-full text-sm">
        <thead className="border-b">
          <tr>
            <th className="text-left py-2 text-gray-600 font-medium">Description</th>
            <th className="text-right py-2 text-gray-600 font-medium w-16">Qty</th>
            <th className="text-right py-2 text-gray-600 font-medium w-28">Unit Price</th>
            <th className="text-right py-2 text-gray-600 font-medium w-28">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-right">{Number(item.quantity)}</td>
              <td className="py-2 text-right">{formatCurrency(Number(item.unitPrice))}{suffix}</td>
              <td className="py-2 text-right font-medium">
                {formatCurrency(lineItemTotal({ quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }))}
                {suffix}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t pt-2 space-y-0.5 text-sm text-right text-gray-600">
        <p>Subtotal: {formatCurrency(sub)}{suffix}</p>
        <p>GST (15%): {formatCurrency(gstAmount)}{suffix}</p>
        <p className="font-semibold text-gray-900 text-base">Total: {formatCurrency(total)}{suffix}</p>
      </div>
    </div>
  )
}

export function ProposalLineItems({ lineItems }: { lineItems: LineItem[] }) {
  const oneOff = lineItems.filter((i) => i.type === 'ONE_OFF')
  const recurring = lineItems.filter((i) => i.type === 'RECURRING')

  return (
    <div className="space-y-8">
      <LineTable title="One-off Costs" items={oneOff} />
      <LineTable title="Monthly Recurring" items={recurring} perSuffix="/mo" />
    </div>
  )
}
```

- [ ] **Step 3: Create accept/decline buttons (client component)**

Create `components/proposal/proposal-actions.tsx`:
```typescript
'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { acceptQuote, declineQuote } from '@/app/proposals/[token]/actions'
import { useRouter } from 'next/navigation'

type Props = {
  token: string
  status: string
}

export function ProposalActions({ token, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState(status)

  if (localStatus === 'ACCEPTED') {
    return (
      <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
        <p className="text-green-700 font-semibold text-lg">Quote Accepted</p>
        <p className="text-green-600 text-sm mt-1">Thank you — we'll be in touch shortly.</p>
      </div>
    )
  }

  if (localStatus === 'DECLINED') {
    return (
      <div className="text-center py-6 bg-red-50 rounded-lg border border-red-200">
        <p className="text-red-700 font-semibold text-lg">Quote Declined</p>
        <p className="text-red-600 text-sm mt-1">Thank you for letting us know.</p>
      </div>
    )
  }

  function handleAccept() {
    startTransition(async () => {
      await acceptQuote(token)
      setLocalStatus('ACCEPTED')
      router.push(`/proposals/${token}/done?result=accepted`)
    })
  }

  function handleDecline() {
    startTransition(async () => {
      await declineQuote(token)
      setLocalStatus('DECLINED')
      router.push(`/proposals/${token}/done?result=declined`)
    })
  }

  return (
    <div className="flex gap-4 justify-center pt-4">
      <Button
        onClick={handleAccept}
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700 text-white px-8"
        size="lg"
      >
        {isPending ? 'Processing…' : 'Accept Quote'}
      </Button>
      <Button
        onClick={handleDecline}
        disabled={isPending}
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50 px-8"
        size="lg"
      >
        {isPending ? 'Processing…' : 'Decline Quote'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Create accept/decline server actions**

Create `app/proposals/[token]/actions.ts`:
```typescript
'use server'
import { prisma } from '@/lib/prisma'

export async function acceptQuote(token: string): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { token },
    include: { client: true },
  })
  if (!quote || quote.status !== 'SENT') return

  await prisma.quote.update({
    where: { token },
    data: { status: 'ACCEPTED' },
  })

  // Alert email wired in Task 12
}

export async function declineQuote(token: string): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { token },
    include: { client: true },
  })
  if (!quote || quote.status !== 'SENT') return

  await prisma.quote.update({
    where: { token },
    data: { status: 'DECLINED' },
  })

  // Alert email wired in Task 12
}
```

- [ ] **Step 5: Create public proposal page**

Create `app/proposals/[token]/page.tsx`:
```typescript
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { ProposalHeader } from '@/components/proposal/proposal-header'
import { ProposalLineItems } from '@/components/proposal/proposal-line-items'
import { ProposalActions } from '@/components/proposal/proposal-actions'

type Props = { params: Promise<{ token: string }> }

export default async function ProposalPage({ params }: Props) {
  const { token } = await params

  const [quote, brand] = await Promise.all([
    prisma.quote.findUnique({
      where: { token },
      include: {
        client: true,
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    prisma.brandSettings.findUnique({ where: { id: 'singleton' } }),
  ])

  if (!quote || !brand) notFound()

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-0">
        <ProposalHeader brand={brand} />

        <div className="bg-white shadow-sm px-8 py-6 space-y-8">
          {/* Meta */}
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quotation Proposal</h2>
              <p className="text-gray-500 text-sm mt-1">
                Prepared for: <span className="font-medium text-gray-700">{quote.client.name}</span>
              </p>
              {quote.client.contactName && (
                <p className="text-gray-500 text-sm">Attn: {quote.client.contactName}</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-mono font-bold text-gray-900">{quote.quoteNumber}</p>
              <p className="text-gray-500 text-sm">
                {quote.sentAt
                  ? new Date(quote.sentAt).toLocaleDateString('en-NZ')
                  : new Date(quote.createdAt).toLocaleDateString('en-NZ')}
              </p>
            </div>
          </div>

          {/* Scope */}
          {quote.notes && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Scope of Work</h3>
              <p className="text-gray-600 whitespace-pre-line">{quote.notes}</p>
            </div>
          )}

          {/* Line Items */}
          <ProposalLineItems lineItems={quote.lineItems} />

          {/* Terms */}
          {quote.terms && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Terms & Conditions</h3>
              <p className="text-gray-500 text-sm whitespace-pre-line">{quote.terms}</p>
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-6">
            <ProposalActions token={token} status={quote.status} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-b-xl px-8 py-4 text-center">
          <p className="text-gray-400 text-xs">
            {brand.companyName}
            {brand.phone && ` · ${brand.phone}`}
            {brand.email && ` · ${brand.email}`}
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add client proposal view with accept/decline"
```

---

## Task 12: Response Alert Email + Confirmation Page

**Files:**
- Create: `emails/response-alert-email.tsx`
- Create: `app/proposals/[token]/done/page.tsx`
- Modify: `app/proposals/[token]/actions.ts`

- [ ] **Step 1: Create response alert email template**

Create `emails/response-alert-email.tsx`:
```typescript
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'

type Props = {
  clientName: string
  quoteNumber: string
  quoteTitle: string
  quoteUrl: string
  accepted: boolean
  companyName: string
}

export function ResponseAlertEmail({
  clientName,
  quoteNumber,
  quoteTitle,
  quoteUrl,
  accepted,
  companyName,
}: Props) {
  const verb = accepted ? 'ACCEPTED' : 'DECLINED'
  const color = accepted ? '#16a34a' : '#dc2626'

  return (
    <Html>
      <Head />
      <Preview>{clientName} has {verb.toLowerCase()} quote {quoteNumber}</Preview>
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Section style={{ backgroundColor: color, padding: '16px 24px', borderRadius: '8px 8px 0 0' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>
              {accepted ? '✓' : '✗'} Quote {verb}
            </Heading>
          </Section>
          <Section style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '0 0 8px 8px' }}>
            <Text style={{ color: '#374151' }}>
              <strong>{clientName}</strong> has {verb.toLowerCase()} the following quote:
            </Text>
            <Text style={{ color: '#374151' }}>
              <strong>Quote:</strong> {quoteNumber}<br />
              <strong>Title:</strong> {quoteTitle}
            </Text>
            <Button
              href={quoteUrl}
              style={{
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              View in {companyName}
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ResponseAlertEmail
```

- [ ] **Step 2: Wire alert email into accept/decline actions**

Replace the contents of `app/proposals/[token]/actions.ts`:
```typescript
'use server'
import { prisma } from '@/lib/prisma'
import { sendResponseAlertEmail } from '@/lib/email'

async function updateQuoteStatus(token: string, accepted: boolean): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { token },
    include: { client: true },
  })
  if (!quote || quote.status !== 'SENT') return

  const status = accepted ? 'ACCEPTED' : 'DECLINED'
  await prisma.quote.update({ where: { token }, data: { status } })

  const brand = await prisma.brandSettings.findUnique({ where: { id: 'singleton' } })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (brand?.notifyEmail) {
    try {
      await sendResponseAlertEmail({
        to: brand.notifyEmail,
        clientName: quote.client.name,
        quoteNumber: quote.quoteNumber,
        quoteTitle: quote.title,
        quoteUrl: `${appUrl}/quotes/${quote.id}`,
        accepted,
        companyName: brand.companyName,
      })
    } catch (err) {
      console.error('Failed to send response alert email:', err)
    }
  }
}

export async function acceptQuote(token: string): Promise<void> {
  await updateQuoteStatus(token, true)
}

export async function declineQuote(token: string): Promise<void> {
  await updateQuoteStatus(token, false)
}
```

- [ ] **Step 3: Create confirmation page**

Create `app/proposals/[token]/done/page.tsx`:
```typescript
type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ result?: string }>
}

export default async function ProposalDonePage({ searchParams }: Props) {
  const { result } = await searchParams
  const accepted = result === 'accepted'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-10 text-center space-y-4">
        <div className={`text-5xl ${accepted ? 'text-green-500' : 'text-gray-400'}`}>
          {accepted ? '✓' : '—'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {accepted ? 'Quote Accepted' : 'Quote Declined'}
        </h1>
        <p className="text-gray-500">
          {accepted
            ? "Thank you for accepting our proposal. We'll be in touch shortly to discuss next steps."
            : 'Thank you for letting us know. Please feel free to contact us if you have any questions.'}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add response alert email and proposal confirmation page"
```

---

## Task 13: Settings Page

**Files:**
- Create: `app/(staff)/settings/actions.ts`
- Create: `app/(staff)/settings/page.tsx`

- [ ] **Step 1: Create settings server actions**

Create `app/(staff)/settings/actions.ts`:
```typescript
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
```

- [ ] **Step 2: Create settings page**

Create `app/(staff)/settings/page.tsx`:
```typescript
'use client'
import { useActionState } from 'react'
import { updateSettings } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useEffect, useState } from 'react'

// Fetch brand on server side, pass as props — wrap in a server component outer shell
export { default } from './settings-page-wrapper'
```

Actually, let me simplify by making this a proper server+client split. Replace the contents above with:

Create `app/(staff)/settings/page.tsx` (server component that fetches data):
```typescript
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
```

Create `app/(staff)/settings/settings-form.tsx` (client form):
```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add settings page with branding and logo upload"
```

---

## Task 14: Unit + Integration Tests

**Files:**
- Create: `__tests__/api/quote-actions.test.ts`
- Create: `__tests__/api/proposal-actions.test.ts`

- [ ] **Step 1: Create quote actions tests**

Create `__tests__/api/quote-actions.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma and auth
vi.mock('@/lib/prisma', () => ({
  prisma: {
    quote: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    client: { create: vi.fn() },
    lineItem: { deleteMany: vi.fn() },
    brandSettings: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => ({ user: { id: 'user-1', name: 'Admin', email: 'admin@pctechnz.co.nz' } })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/email', () => ({ sendProposalEmail: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { duplicateQuote } from '@/app/(staff)/quotes/[id]/actions'

describe('duplicateQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns error when quote not found', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(null)
    const result = await duplicateQuote('nonexistent')
    expect(result.error).toBe('Not found')
  })

  it('returns error when quote belongs to different user', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      id: 'q-1',
      authorId: 'different-user',
      lineItems: [],
    } as any)
    const result = await duplicateQuote('q-1')
    expect(result.error).toBe('Not found')
  })

  it('creates a new draft when quote is valid', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      id: 'q-1',
      authorId: 'user-1',
      title: 'Test Quote',
      notes: null,
      terms: null,
      clientId: 'client-1',
      lineItems: [],
    } as any)
    vi.mocked(prisma.quote.count).mockResolvedValue(5)
    vi.mocked(prisma.quote.create).mockResolvedValue({ id: 'new-q' } as any)

    const result = await duplicateQuote('q-1')
    expect(result.newId).toBe('new-q')
    expect(prisma.quote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quoteNumber: 'PCT-0006',
          title: 'Test Quote (copy)',
          status: 'DRAFT',
        }),
      })
    )
  })
})
```

- [ ] **Step 2: Create proposal actions tests**

Create `__tests__/api/proposal-actions.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    quote: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    brandSettings: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/email', () => ({
  sendResponseAlertEmail: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { acceptQuote, declineQuote } from '@/app/proposals/[token]/actions'

const mockSentQuote = {
  id: 'q-1',
  token: 'abc123',
  status: 'SENT',
  quoteNumber: 'PCT-0001',
  title: 'Test',
  client: { name: 'Whareawhina' },
}

describe('acceptQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when quote is not found', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(null)
    await acceptQuote('bad-token')
    expect(prisma.quote.update).not.toHaveBeenCalled()
  })

  it('does nothing when quote is not SENT', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue({
      ...mockSentQuote,
      status: 'ACCEPTED',
    } as any)
    await acceptQuote('abc123')
    expect(prisma.quote.update).not.toHaveBeenCalled()
  })

  it('sets status to ACCEPTED for a SENT quote', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(mockSentQuote as any)
    vi.mocked(prisma.brandSettings.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.quote.update).mockResolvedValue({} as any)

    await acceptQuote('abc123')
    expect(prisma.quote.update).toHaveBeenCalledWith({
      where: { token: 'abc123' },
      data: { status: 'ACCEPTED' },
    })
  })
})

describe('declineQuote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets status to DECLINED for a SENT quote', async () => {
    vi.mocked(prisma.quote.findUnique).mockResolvedValue(mockSentQuote as any)
    vi.mocked(prisma.brandSettings.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.quote.update).mockResolvedValue({} as any)

    await declineQuote('abc123')
    expect(prisma.quote.update).toHaveBeenCalledWith({
      where: { token: 'abc123' },
      data: { status: 'DECLINED' },
    })
  })
})
```

- [ ] **Step 3: Run all unit + integration tests**

```bash
npm test
```

Expected: All tests PASS (pricing, quotes, quote-actions, proposal-actions).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add unit and integration tests for pricing, quotes, and actions"
```

---

## Task 15: E2E Tests

**Files:**
- Create: `e2e/quote-flow.spec.ts`

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Write E2E test**

Create `e2e/quote-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Quote flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@pctechnz.co.nz')
    await page.fill('[name="password"]', 'changeme123')
    await page.click('[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('staff can create a quote and it appears on the dashboard', async ({ page }) => {
    await page.click('text=New Quote')
    await page.waitForURL(/\/quotes\//)

    // Fill in title
    const titleInput = page.locator('#title')
    await titleInput.clear()
    await titleInput.fill('E2E Test Quote')

    // Add a one-off line item
    await page.click('text=+ Add Row', { force: true })
    const descInput = page.locator('input[placeholder="Description"]').first()
    await descInput.fill('Test Item')

    // Save draft
    await page.click('text=Save Draft')
    await expect(page.locator('text=Saved')).toBeVisible()

    // Navigate to dashboard and verify
    await page.goto('/dashboard')
    await expect(page.locator('text=E2E Test Quote')).toBeVisible()
  })

  test('client proposal page shows accept and decline buttons', async ({ page, browser }) => {
    // Create and send a quote first
    await page.click('text=New Quote')
    await page.waitForURL(/\/quotes\//)

    const titleInput = page.locator('#title')
    await titleInput.clear()
    await titleInput.fill('Client Test Quote')
    await page.click('text=Save Draft')
    await page.waitForSelector('text=Saved')

    await page.click('text=Send to Client')
    await page.waitForSelector('text=Sent')

    // Get the proposal link
    await page.click('text=Copy proposal link')
    const url = await page.evaluate(() => navigator.clipboard.readText())

    // Open proposal in a new context (unauthenticated)
    const clientContext = await browser.newContext()
    const clientPage = await clientContext.newPage()
    await clientPage.goto(url)

    await expect(clientPage.locator('text=Accept Quote')).toBeVisible()
    await expect(clientPage.locator('text=Decline Quote')).toBeVisible()

    // Accept the quote
    await clientPage.click('text=Accept Quote')
    await expect(clientPage.locator('text=Quote Accepted')).toBeVisible()

    await clientContext.close()

    // Staff dashboard should show ACCEPTED
    await page.goto('/dashboard')
    await expect(page.locator('text=ACCEPTED')).toBeVisible()
  })
})
```

- [ ] **Step 3: Run E2E tests**

```bash
npm run dev &
npm run test:e2e
```

Expected: Both tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add Playwright E2E tests for full quote flow"
```

---

## Task 16: Vercel Deployment

**Files:**
- No new files — configure via Vercel CLI and dashboard

- [ ] **Step 1: Link project to Vercel**

```bash
npx vercel link
```

Select existing project `whareawhina` (linked to `jacoinnz/whareawhina` on GitHub).

- [ ] **Step 2: Provision Neon Postgres**

In the Vercel dashboard → Storage → Connect Database → Neon Postgres → Create new database → name it `whareawhina-db`. Vercel automatically adds `DATABASE_URL` to all environments.

- [ ] **Step 3: Add remaining environment variables**

```bash
npx vercel env add AUTH_SECRET production
# paste value from: openssl rand -base64 32

npx vercel env add AUTH_URL production
# value: https://whareawhina.vercel.app  (your production URL)

npx vercel env add RESEND_API_KEY production
# paste from Resend dashboard

npx vercel env add NEXT_PUBLIC_APP_URL production
# value: https://whareawhina.vercel.app
```

Also add the same vars to `preview` and `development` environments as appropriate.

- [ ] **Step 4: Pull env to local**

```bash
npx vercel env pull .env.local
```

- [ ] **Step 5: Run production migration**

```bash
npx prisma migrate deploy
```

This applies all migrations to the Neon production database.

- [ ] **Step 6: Seed production database**

```bash
npx prisma db seed
```

Expected output: `Seed complete. Login: admin@pctechnz.co.nz / changeme123`

- [ ] **Step 7: Set up BLOB_READ_WRITE_TOKEN**

In Vercel dashboard → Storage → Blob → Create Store. Copy the token and add it:

```bash
npx vercel env add BLOB_READ_WRITE_TOKEN production
```

Also update `.env.local` with the token.

- [ ] **Step 8: Deploy to preview**

```bash
git push origin main
```

Vercel auto-deploys on push. Check the deployment URL in the Vercel dashboard.

- [ ] **Step 9: Promote to production**

```bash
npx vercel --prod
```

- [ ] **Step 10: Verify production**

1. Open production URL → should redirect to `/login`
2. Sign in with `admin@pctechnz.co.nz` / `changeme123`
3. Go to `/settings` → update company details and notification email
4. Create a test quote → send to client → open proposal link → accept
5. Verify notification email arrives at the configured address

- [ ] **Step 11: Final commit**

```bash
git add -A
git commit -m "chore: finalise deployment configuration"
git push origin main
```

---

## Self-Review Checklist

- [x] Spec §1 (Stack) — covered in Task 1 (scaffold)
- [x] Spec §2 (Data Model) — covered in Task 2 (Prisma schema)
- [x] Spec §3 (Pages & Routes) — all routes covered in Tasks 3, 7, 9, 11, 12, 13
- [x] Spec §4 (Status Lifecycle) — enforced in `saveQuote`, `sendToClient`, `acceptQuote`, `declineQuote`
- [x] Spec §5 (Quote Builder UI) — covered in Tasks 8, 9
- [x] Spec §6 (Proposal View) — covered in Task 11
- [x] Spec §7 (Email Notifications) — covered in Tasks 10, 12
- [x] Spec §8 (Settings) — covered in Task 13
- [x] Spec §9 (Error Handling) — invalid token → `notFound()`, responded quote → buttons hidden, email failure → logged not blocked, unauthenticated → middleware redirect
- [x] Spec §10 (Testing) — unit in Tasks 4/5/14, integration in Task 14, E2E in Task 15
- [x] Duplicate Quote — covered in Task 9 (`duplicateQuote` action)
- [x] Auto-generate quote number PCT-XXXX — `nextQuoteNumber()` used in Tasks 5, 9
- [x] Read-only line items after DRAFT — enforced in `QuoteEditorForm` and `saveQuote`
- [x] GST 15% NZ — `GST_RATE = 0.15` in `lib/pricing.ts`
