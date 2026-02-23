-- ============================================================
-- Polymarket for Friends — Initial Schema
-- Run against your Supabase project SQL editor or via CLI:
--   supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ---- Enums --------------------------------------------------

create type market_status as enum ('open', 'closed', 'resolved');
create type outcome_type   as enum ('YES', 'NO');
create type member_role    as enum ('admin', 'member');

-- ---- Groups -------------------------------------------------

create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 500),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ---- Group Members ------------------------------------------

create table group_members (
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       member_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on group_members(user_id);

-- ---- Wallets ------------------------------------------------
-- One wallet per (user, group). Seeded with starting_balance on join.

create table wallets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  group_id    uuid not null references groups(id) on delete cascade,
  balance     numeric(18, 6) not null default 1000 check (balance >= 0),
  updated_at  timestamptz not null default now(),
  unique (user_id, group_id)
);

create index wallets_user_idx  on wallets(user_id);
create index wallets_group_idx on wallets(group_id);

-- ---- Markets ------------------------------------------------

create table markets (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  creator_id  uuid not null references auth.users(id) on delete cascade,
  question    text not null check (char_length(question) between 10 and 200),
  description text check (char_length(description) <= 1000),
  status      market_status not null default 'open',
  outcome     outcome_type,                        -- set on resolution
  -- LMSR state
  b_liquidity numeric(18, 6) not null default 50 check (b_liquidity > 0),
  q_yes       numeric(18, 6) not null default 0,
  q_no        numeric(18, 6) not null default 0,
  -- Timing
  close_time  timestamptz not null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  -- Constraints
  check (resolved_at is null or outcome is not null),
  check (close_time > created_at)
);

create index markets_group_idx   on markets(group_id);
create index markets_status_idx  on markets(status);
create index markets_close_idx   on markets(close_time);

-- ---- Trades -------------------------------------------------
-- Immutable. One row per trade execution.

create table trades (
  id               uuid primary key default gen_random_uuid(),
  market_id        uuid not null references markets(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  outcome          outcome_type not null,
  shares           numeric(18, 6) not null check (shares > 0),
  cost             numeric(18, 6) not null check (cost > 0),
  note             text not null check (char_length(note) between 1 and 240),
  price_yes_before numeric(18, 6) not null,
  price_yes_after  numeric(18, 6) not null,
  created_at       timestamptz not null default now()
);

create index trades_market_idx on trades(market_id, created_at desc);
create index trades_user_idx   on trades(user_id);

-- ---- Positions ----------------------------------------------
-- Cumulative shares per (user, market). Updated atomically with trades.

create table positions (
  id          uuid primary key default gen_random_uuid(),
  market_id   uuid not null references markets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  yes_shares  numeric(18, 6) not null default 0 check (yes_shares >= 0),
  no_shares   numeric(18, 6) not null default 0 check (no_shares >= 0),
  updated_at  timestamptz not null default now(),
  unique (market_id, user_id)
);

create index positions_market_idx on positions(market_id);
create index positions_user_idx   on positions(user_id);

-- ---- Claims -------------------------------------------------

create table claims (
  id          uuid primary key default gen_random_uuid(),
  market_id   uuid not null references markets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(18, 6) not null check (amount > 0),
  claimed_at  timestamptz not null default now(),
  unique (market_id, user_id)  -- one claim per user per market
);

create index claims_market_idx on claims(market_id);
create index claims_user_idx   on claims(user_id);

-- ---- Price Snapshots ----------------------------------------
-- Appended after every trade for charting.

create table price_snapshots (
  id          uuid primary key default gen_random_uuid(),
  market_id   uuid not null references markets(id) on delete cascade,
  price_yes   numeric(18, 6) not null,
  price_no    numeric(18, 6) not null,
  created_at  timestamptz not null default now()
);

create index price_snapshots_market_idx on price_snapshots(market_id, created_at asc);

-- ---- Group Invites ------------------------------------------

create table group_invites (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  token       text not null unique,                      -- URL-safe random string
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz,                               -- null = never expires
  max_uses    integer check (max_uses > 0),              -- null = unlimited
  use_count   integer not null default 0 check (use_count >= 0),
  created_at  timestamptz not null default now()
);

create index group_invites_token_idx    on group_invites(token);
create index group_invites_group_idx    on group_invites(group_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table groups          enable row level security;
alter table group_members   enable row level security;
alter table wallets         enable row level security;
alter table markets         enable row level security;
alter table trades          enable row level security;
alter table positions       enable row level security;
alter table claims          enable row level security;
alter table price_snapshots enable row level security;
alter table group_invites   enable row level security;

-- Helper: is the calling user a member of the given group?
create or replace function is_group_member(p_group_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
  );
$$;

-- ---- groups -------------------------------------------------
-- Members can read; only creator can see from groups directly
-- (indirect access is via group_members join)

create policy "members can read group"
  on groups for select
  using (is_group_member(id));

create policy "authenticated users can create groups"
  on groups for insert
  with check (auth.uid() = created_by);

-- ---- group_members ------------------------------------------

create policy "members can see group membership"
  on group_members for select
  using (is_group_member(group_id));

create policy "service role can insert members"
  on group_members for insert
  with check (true);  -- restricted to service role via API

-- ---- wallets ------------------------------------------------

create policy "user can read own wallets"
  on wallets for select
  using (user_id = auth.uid() or is_group_member(group_id));

-- ---- markets ------------------------------------------------

create policy "members can read group markets"
  on markets for select
  using (is_group_member(group_id));

-- ---- trades -------------------------------------------------

create policy "members can read group trades"
  on trades for select
  using (
    exists (
      select 1 from markets m
      where m.id = market_id
        and is_group_member(m.group_id)
    )
  );

-- ---- positions ----------------------------------------------

create policy "members can read positions"
  on positions for select
  using (
    exists (
      select 1 from markets m
      where m.id = market_id
        and is_group_member(m.group_id)
    )
  );

create policy "user can read own positions"
  on positions for select
  using (user_id = auth.uid());

-- ---- claims -------------------------------------------------

create policy "user can read own claims"
  on claims for select
  using (user_id = auth.uid());

-- ---- price_snapshots ----------------------------------------

create policy "members can read price history"
  on price_snapshots for select
  using (
    exists (
      select 1 from markets m
      where m.id = market_id
        and is_group_member(m.group_id)
    )
  );

-- ---- group_invites ------------------------------------------

create policy "group members can read invites"
  on group_invites for select
  using (is_group_member(group_id));

-- Anyone can look up an invite by token (for the join flow)
create policy "anyone can look up invite by token"
  on group_invites for select
  using (true);  -- filtered to token in application layer
