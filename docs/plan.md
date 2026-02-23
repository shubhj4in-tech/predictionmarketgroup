# Polymarket for Friends — Implementation Plan

## Product Vision

A mobile-first web app for private friend-group prediction markets. Users create private groups, invite friends via link, create YES/NO markets, trade with play-money credits, and see live prices. Markets are resolved by the creator; winners claim payouts.

Primary use case: "Will Shubh get an A in CS106B this quarter?"

---

## Phased Milestones

### Phase 1 — Scaffold + Contracts ✅
- [x] Next.js 15 App Router, TypeScript, Tailwind
- [x] Supabase SSR client setup (browser + server + service-role)
- [x] Auth middleware (redirect unauthenticated → /signin)
- [x] Page route stubs: /signin, /groups, /groups/[groupId], /groups/[groupId]/markets/new, /markets/[marketId], /invite/[token]
- [x] API route stubs (501 responses)
- [x] TypeScript domain types (`types/domain.ts`)
- [x] API request/response contracts (`types/api.ts`)
- [x] Supabase Database type (`types/database.ts`)
- [x] SQL migration with RLS (`supabase/migrations/0001_initial_schema.sql`)
- [x] LMSR engine scaffold (`lib/lmsr/index.ts`)
- [x] `docs/plan.md` (this file)
- [x] `.env.example`

### Phase 2 — LMSR Pricing Engine + Tests
- [ ] Complete `lib/lmsr/index.ts` with full precision math
- [ ] Unit tests: cost, priceYes, priceNo, sharesForSpend, edge cases
- [ ] Verify no floating-point drift for realistic trade sizes
- [ ] Run `npm run typecheck && npm run lint`

### Phase 3 — Transactional Backend
- [ ] `POST /api/groups` — create group + auto-join + wallet + first invite
- [ ] `GET  /api/groups` — list user's groups
- [ ] `POST /api/groups/[groupId]/markets` — create market (members only)
- [ ] `GET  /api/groups/[groupId]/markets` — list markets
- [ ] `GET  /api/markets/[marketId]` — full market detail
- [ ] `POST /api/markets/[marketId]/trade` — atomic trade (balance, q-values, position, trade row, price snapshot)
- [ ] `POST /api/markets/[marketId]/resolve` — creator resolves market
- [ ] `POST /api/claims/[marketId]` — claim winnings (idempotent, once per user)
- [ ] Server-side auth on every route
- [ ] Membership checks (group members only)
- [ ] Row-level locking for trade + claim atomicity

### Phase 4 — Core Mobile UI
- [ ] `/signin` — Supabase Auth UI (magic link or OAuth)
- [ ] `/groups` — list groups + create group button
- [ ] `/groups/[groupId]` — group overview: markets list, leaderboard tab
- [ ] `/groups/[groupId]/markets/new` — create market form
- [ ] `/markets/[marketId]` — full market page:
  - Market question + status
  - YES/NO prices
  - Trade widget (spend amount + YES/NO toggle + rationale input)
  - Trades feed
  - My position
  - Resolve panel (creator only, after close_time)
  - Claim button (if resolved + eligible)
- [ ] Polling (refetch every 10s on market page)
- [ ] Mobile-first layout, large tap targets

### Phase 5 — Invite Link Flow
- [ ] `POST /api/invites` — create invite (admin only)
- [ ] `GET  /api/invites/[token]` — preview invite (group name, member count)
- [ ] `POST /api/invites/[token]` — accept invite (join group + create wallet)
- [ ] `/invite/[token]` page — preview + accept UI
- [ ] Share button (copy URL / iOS share sheet)
- [ ] Token expiry + max_uses enforcement

### Phase 6 — OpenGraph Metadata + Dynamic OG Image
- [ ] Dynamic `<head>` metadata for `/markets/[marketId]` (market question + prices)
- [ ] `/api/og/market/[marketId]` — dynamic OG image using `@vercel/og`
- [ ] Card design: question text, YES %, NO %, group name, branding
- [ ] Test in iMessage / Telegram link previews

### Phase 7 — Validation, Polish, Seed Data, README
- [ ] Zod validation on all API inputs
- [ ] Seed data script (`supabase/seed.sql` or `scripts/seed.ts`)
- [ ] README with setup instructions
- [ ] Error boundaries + toast notifications
- [ ] Market auto-close (cron or close-on-trade check)
- [ ] Final typecheck / lint / build pass

---

## Architecture Decisions

### Framework
- **Next.js 15 App Router** — server components + route handlers in one codebase; Vercel-native.

### Auth
- **Supabase Auth** — magic link (email) for v1. No passwords to manage. Session via `@supabase/ssr` cookies.

### Database
- **Supabase Postgres** — RLS enforces read access per group membership. Service-role key used server-side for atomic trade writes.

### LMSR (AMM)
- **Logarithmic Market Scoring Rule** with a fixed liquidity parameter `b`.
- `b` defaults to 50 credits. Higher `b` = flatter price curve = less slippage.
- Starting q_yes = q_no = 0 → initial price is 0.5/0.5.
- **Decimal.js** used throughout to avoid float drift.

### Trade Atomicity
- All trades executed server-side via service-role client.
- Single DB transaction: UPDATE wallet, UPDATE market (q_yes/q_no), UPSERT position, INSERT trade, INSERT price_snapshot.
- Use `SELECT ... FOR UPDATE` (row lock) on wallet and market rows to prevent race conditions.

### No WebSockets
- Polling every 10s on market page. Acceptable for v1 friend-group scale.

### No Real Money
- Wallets hold play-money credits (numeric). No payment integration.

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Supabase RLS gap allowing cross-group data leak | Medium | Thorough RLS policy review + integration tests in Phase 7 |
| LMSR math drift with large share counts | Low | Decimal.js with precision=28; unit tests with edge cases |
| Race condition on simultaneous trades | Medium | SELECT FOR UPDATE row locking in trade handler |
| OG image slow cold start | Low | Cache OG images at CDN level; `@vercel/og` is fast |
| invite token collision | Very Low | Use crypto.randomBytes(32) for token generation |
| Market close_time enforcement | Medium | Check in trade route server-side; auto-close cron in Phase 7 |

---

## File Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── signin/
│   │   └── page.tsx
│   ├── groups/
│   │   ├── page.tsx
│   │   └── [groupId]/
│   │       ├── page.tsx
│   │       └── markets/new/
│   │           └── page.tsx
│   ├── markets/
│   │   └── [marketId]/
│   │       └── page.tsx
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx
│   └── api/
│       ├── groups/
│       │   ├── route.ts
│       │   └── [groupId]/markets/route.ts
│       ├── markets/
│       │   └── [marketId]/
│       │       ├── route.ts
│       │       ├── trade/route.ts
│       │       └── resolve/route.ts
│       ├── claims/
│       │   └── [marketId]/route.ts
│       └── invites/
│           ├── route.ts
│           └── [token]/route.ts
├── components/          # (Phase 4)
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # browser client
│   │   ├── server.ts    # server component client
│   │   └── service.ts   # service-role client (server only)
│   └── lmsr/
│       └── index.ts     # LMSR engine
├── types/
│   ├── domain.ts        # core entity types
│   ├── api.ts           # request/response contracts
│   └── database.ts      # Supabase generated-style DB types
├── middleware.ts         # auth redirect middleware
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql
├── docs/
│   └── plan.md          # this file
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Supabase Setup Guide

1. Create a project at https://supabase.com
2. In SQL Editor, run `supabase/migrations/0001_initial_schema.sql`
3. Copy project URL and anon key to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx
   ```
4. Enable Email (magic link) auth in Authentication → Providers
5. Set Site URL to `http://localhost:3000` for local dev; update for production
6. (Optional) Set up Supabase CLI: `supabase init` and link project for migration management

---

## API Contract Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/groups | required | Create group |
| GET | /api/groups | required | List my groups |
| POST | /api/groups/[groupId]/markets | member | Create market |
| GET | /api/groups/[groupId]/markets | member | List markets |
| GET | /api/markets/[marketId] | member | Market detail + trades |
| POST | /api/markets/[marketId]/trade | member | Execute trade (atomic) |
| POST | /api/markets/[marketId]/resolve | creator | Resolve market |
| POST | /api/claims/[marketId] | member | Claim winnings |
| POST | /api/invites | admin | Create invite link |
| POST | /api/invites/[token] | required | Accept invite (join group) |

All endpoints return `{ error: string, code?: string }` on failure with appropriate HTTP status.

---

## Credits / Starting Balance

- Every user who joins a group receives **1,000 credits**.
- Credits are play-money only. No real-money equivalent.
- Winning shares pay **1 credit per share** at resolution.
