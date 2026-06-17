# Quotation Proposal System — Design Spec

**Date:** 2026-06-18  
**Project:** whareawhina  
**Built by:** PCTECHNZ  
**Purpose:** Internal tool for PCTECHNZ staff to create and send branded IT quotation proposals to clients. Clients receive a private link to view and accept or decline the proposal online.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Auth | NextAuth v5 — email/password for PCTECHNZ staff |
| Database | Neon Postgres via Vercel Marketplace |
| ORM | Prisma |
| Email | Resend |
| UI | Tailwind CSS + shadcn/ui |
| Deploy | Vercel (preview + production) |

Clients access proposals via a unique secret token URL (`/proposals/[token]`) — no login or account required.

---

## 2. Data Model

```prisma
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
  id          String     @id @default(cuid())
  quoteNumber String     @unique  // e.g. PCT-0042
  title       String
  status      QuoteStatus @default(DRAFT)
  token       String     @unique  // secret client link token
  notes       String?    // scope / description
  terms       String?
  sentAt      DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  client      Client     @relation(fields: [clientId], references: [id])
  clientId    String
  author      User       @relation(fields: [authorId], references: [id])
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
  quantity    Decimal
  unitPrice   Decimal
  quote       Quote        @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  quoteId     String
  sortOrder   Int          @default(0)  // preserves display order within each type
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
  notifyEmail  String?  // where accept/decline alerts are sent
  defaultTerms String?  // pre-filled on new quotes
}
```

---

## 3. Pages & Routes

### Staff-facing (requires NextAuth session)

| Route | Purpose |
|---|---|
| `/login` | PCTECHNZ staff sign in |
| `/dashboard` | Quote list with status badges, search, sort |
| `/quotes/new` | Create quote — client details + first line items |
| `/quotes/[id]` | Edit quote, manage line items, send to client |
| `/settings` | Update PCTECHNZ branding, contact info, default terms |

### Client-facing (public, token-gated)

| Route | Purpose |
|---|---|
| `/proposals/[token]` | Branded proposal view + Accept / Decline |
| `/proposals/[token]/done` | Confirmation page after client responds |

---

## 4. Status Lifecycle

```
DRAFT → (staff clicks "Send to Client") → SENT
SENT  → (client clicks Accept)          → ACCEPTED
SENT  → (client clicks Decline)         → DECLINED
```

Once a quote leaves `DRAFT` its line items become read-only to preserve the historical record. Staff can **Duplicate** any quote to clone it into a new `DRAFT`.

Quote numbers are auto-generated sequentially: `PCT-0001`, `PCT-0002`, etc.

---

## 5. Quote Builder UI (`/quotes/[id]`)

Three logical panels:

**Header panel**
- Quote number (read-only, auto-assigned), title, date
- Client selector — pick existing client or create new inline (required: name, contactName, email; optional: phone, address)
- Notes / scope description (textarea)

**Line items panel — two independent tables**

*One-off Costs* — hardware, project work, software licences (one-time)
- Columns: Description | Qty | Unit Price | Total
- Live subtotal, GST (15%), one-off grand total

*Monthly Recurring* — managed services, support contracts, monthly licensing
- Columns: Description | Qty | Unit Price/mo | Monthly Total
- Live monthly subtotal, GST (15%), monthly grand total

Rows are added/removed inline. Both tables are editable only while status is `DRAFT`.

**Footer panel**
- Terms & conditions textarea (pre-filled from `BrandSettings.defaultTerms`)
- Status badge
- Action buttons: **Save Draft** | **Send to Client** | **Copy Link** (after sent) | **Duplicate**

---

## 6. Client Proposal View (`/proposals/[token]`)

Fully branded, public page:

```
┌─────────────────────────────────────────┐
│  [PCTECHNZ Logo]          PCTECHNZ      │
│  phone • email • website                │
├─────────────────────────────────────────┤
│  QUOTATION PROPOSAL          PCT-0042   │
│  Prepared for: [Client Name] [Date]     │
│                                         │
│  Scope / Notes                          │
│  ─────────────────────────────────────  │
│  ONE-OFF COSTS                          │
│  Description        Qty  Price   Total  │
│  Subtotal / GST / Total                 │
│                                         │
│  MONTHLY RECURRING                      │
│  Description        Qty  $/mo    Total  │
│  Monthly Total / GST incl.              │
│                                         │
│  Terms & Conditions                     │
│  ─────────────────────────────────────  │
│  [ ACCEPT QUOTE ]   [ DECLINE QUOTE ]   │
└─────────────────────────────────────────┘
```

- Buttons are replaced with a status message once the client has responded
- If the proposal is already `ACCEPTED` or `DECLINED` on load, buttons are hidden immediately
- Mobile-responsive — tables reflow on small screens

---

## 7. Email Notifications (Resend)

### Proposal email → client
Triggered when staff clicks "Send to Client".

```
From:    quotes@pctechnz.co.nz
To:      client contact email
Subject: Your IT Proposal from PCTECHNZ — PCT-0042
Body:    Brief intro, quote title, CTA button linking to /proposals/[token]
         PCTECHNZ branded header
```

### Response alert → PCTECHNZ
Triggered when client accepts or declines.

```
From:    noreply@pctechnz.co.nz
To:      BrandSettings.notifyEmail
Subject: ✓ [Client] has ACCEPTED quote PCT-0042
    OR   ✗ [Client] has DECLINED quote PCT-0042
Body:    Client name, quote title/number, direct link to /quotes/[id]
```

Both emails use React Email templates styled to PCTECHNZ brand colours.

---

## 8. Settings Page (`/settings`)

Single-page form to update `BrandSettings`:
- Logo upload (stored in Vercel Blob, URL saved to BrandSettings)
- Primary brand colour (colour picker)
- Company name, phone, email, address, website
- Notification email (where accept/decline alerts go)
- Default terms & conditions text

---

## 9. Error Handling

| Scenario | Handling |
|---|---|
| Invalid/expired token | `/proposals/[token]` returns a friendly "Proposal not found" page |
| Quote already responded to | Proposal page shows current status, buttons hidden |
| Email send failure | Log error, surface toast in staff UI — do not block status change |
| Unauthenticated staff route | Redirect to `/login` via NextAuth middleware |

---

## 10. Testing Strategy

- **Unit:** Prisma query helpers, price calculation utilities (subtotals, GST)
- **Integration:** API routes — quote CRUD, accept/decline token handler
- **E2E (Playwright):** Staff login → create quote → send → client accepts → staff sees ACCEPTED status

---

## Out of Scope (v1)

- PDF generation
- Client login / portal
- Quote expiry / auto-decline
- Product/service catalogue
- Multi-user roles / permissions
- Payment integration
