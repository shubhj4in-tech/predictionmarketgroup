# Polymarket for Friends

Private prediction markets for friend groups — mobile-first, iMessage-shareable, play-money only.

## Features

- ✅ Create private groups and invite friends via shareable link
- ✅ YES/NO prediction markets with LMSR automated market maker
- ✅ Trade with play-money credits (1,000 on join)
- ✅ Live price chart + trades feed with rationale
- ✅ Market resolution by creator + one-click claim winnings
- ✅ Group leaderboard by balance
- ✅ Dynamic OpenGraph images for rich iMessage previews

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth + DB | Supabase (Postgres + Row Level Security) |
| AMM Math | LMSR via Decimal.js |
| Deployment | Vercel |

---

## Local Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd predictionmarketgroup
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. In **SQL Editor**, run:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rpc_functions.sql`
3. Under **Authentication → Providers → Email**, ensure Email is enabled

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Find these in your Supabase project under **Settings → API**.

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Scripts

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm test           # Run LMSR unit tests (vitest)
```

---

## Project Structure

```
app/
  api/                      # Route handlers (server-side only)
    groups/                 # CRUD groups
    markets/[marketId]/     # Market detail, trade, resolve
    claims/[marketId]/      # Claim winnings
    invites/                # Create + accept invite links
    og/market/[marketId]/   # Dynamic OG image
  auth/callback/            # Supabase PKCE callback
  groups/                   # Groups list + group detail
  markets/[marketId]/       # Market page
  invite/[token]/           # Invite landing page
  signin/                   # Magic link auth
components/
  ui/Button.tsx
  layout/Header.tsx
lib/
  lmsr/index.ts             # LMSR pricing engine (Decimal.js)
  supabase/                 # Browser / server / service-role clients
  auth.ts                   # requireUser, checkMembership helpers
  validators.ts             # Zod schemas
types/
  domain.ts                 # Core entity types
  api.ts                    # Request/response contracts
  database.ts               # Supabase DB type
supabase/
  migrations/               # SQL migrations
  seed.sql                  # Dev seed data
```

---

## LMSR Market Mechanics

Markets use the **Logarithmic Market Scoring Rule (LMSR)**:

- Initial prices: 50% YES / 50% NO
- `b_liquidity` parameter controls price sensitivity (default: 50)
- Buying YES shares pushes YES price up
- Winning shares pay **1 credit each** at resolution
- All math uses [Decimal.js](https://mikemcl.github.io/decimal.js/) (precision=28) to avoid float drift

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add the same env vars from `.env.local`
4. Update `NEXT_PUBLIC_APP_URL` to your production URL
5. In Supabase **Auth → URL Configuration**, add your Vercel URL as a redirect URL

---

## Security Model

- All trade execution happens server-side via `SECURITY DEFINER` PostgreSQL functions
- Client never directly mutates balances, q-values, or positions
- Row Level Security (RLS) enforces group membership for all reads
- Service-role key is only used in server-side API routes (never exposed to browser)
- Auth is validated on every API route via `supabase.auth.getUser()`
