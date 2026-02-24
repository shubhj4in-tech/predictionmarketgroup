-- ============================================================
-- Security hardening
-- ============================================================

-- 1. Profiles: restrict reads to authenticated users only
--    (was `using (true)` — allowed unauthenticated enumeration)
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  using (auth.uid() is not null);

-- 2. Wallets: explicitly deny direct mutations from clients.
--    RPC functions (SECURITY DEFINER) bypass RLS and still work.
--    This prevents a user from calling the Supabase REST API
--    to directly increment their own balance.
create policy "wallets_deny_insert" on wallets for insert with check (false);
create policy "wallets_deny_update" on wallets for update using (false);
create policy "wallets_deny_delete" on wallets for delete using (false);

-- 3. Positions: deny direct mutations (managed by execute_trade RPC)
create policy "positions_deny_insert" on positions for insert with check (false);
create policy "positions_deny_update" on positions for update using (false);
create policy "positions_deny_delete" on positions for delete using (false);

-- 4. Claims: deny direct mutations (managed by execute_claim RPC)
create policy "claims_deny_insert" on claims for insert with check (false);
create policy "claims_deny_update" on claims for update using (false);
create policy "claims_deny_delete" on claims for delete using (false);

-- 5. Trades: deny direct mutations (managed by execute_trade RPC)
create policy "trades_deny_insert" on trades for insert with check (false);
create policy "trades_deny_update" on trades for update using (false);
create policy "trades_deny_delete" on trades for delete using (false);

-- 6. Markets: only group members can resolve (enforced via API, but belt-and-suspenders)
--    Direct status updates are denied; the API layer handles resolution.
create policy "markets_deny_direct_delete" on markets for delete using (false);
