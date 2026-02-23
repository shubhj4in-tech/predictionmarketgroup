-- ============================================================
-- RPC functions for atomic operations
-- Run in Supabase SQL Editor after 0001_initial_schema.sql
-- ============================================================

-- ---- execute_trade ------------------------------------------
-- Atomically executes a trade:
--   1. Locks market + wallet rows (SELECT FOR UPDATE)
--   2. Validates market is open and wallet has sufficient balance
--   3. Updates wallet balance, market q-values, position, trade, price_snapshot
-- Called from the server-side trade route with pre-calculated share/cost values.

create or replace function execute_trade(
  p_market_id        uuid,
  p_user_id          uuid,
  p_outcome          text,
  p_shares           numeric,
  p_cost             numeric,
  p_note             text,
  p_price_yes_before numeric,
  p_price_yes_after  numeric,
  p_new_q_yes        numeric,
  p_new_q_no         numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_market  markets%rowtype;
  v_wallet  wallets%rowtype;
  v_trade_id uuid;
begin
  -- Lock market row first (prevents concurrent trades)
  select * into v_market
  from markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'market_not_found';
  end if;

  if v_market.status != 'open' then
    raise exception 'market_not_open';
  end if;

  -- Auto-close check
  if v_market.close_time <= now() then
    update markets set status = 'closed' where id = p_market_id;
    raise exception 'market_closed';
  end if;

  -- Lock wallet row
  select * into v_wallet
  from wallets
  where user_id = p_user_id
    and group_id = v_market.group_id
  for update;

  if not found then
    raise exception 'wallet_not_found';
  end if;

  if v_wallet.balance < p_cost then
    raise exception 'insufficient_balance';
  end if;

  -- Deduct from wallet
  update wallets
  set balance    = balance - p_cost,
      updated_at = now()
  where id = v_wallet.id;

  -- Update market q-values
  update markets
  set q_yes = p_new_q_yes,
      q_no  = p_new_q_no
  where id = p_market_id;

  -- Upsert position
  insert into positions (market_id, user_id, yes_shares, no_shares)
  values (
    p_market_id,
    p_user_id,
    case when p_outcome = 'YES' then p_shares else 0 end,
    case when p_outcome = 'NO'  then p_shares else 0 end
  )
  on conflict (market_id, user_id) do update
  set yes_shares = positions.yes_shares + case when p_outcome = 'YES' then p_shares else 0 end,
      no_shares  = positions.no_shares  + case when p_outcome = 'NO'  then p_shares else 0 end,
      updated_at = now();

  -- Record trade
  insert into trades (
    market_id, user_id, outcome, shares, cost, note,
    price_yes_before, price_yes_after
  )
  values (
    p_market_id, p_user_id, p_outcome::outcome_type,
    p_shares, p_cost, p_note,
    p_price_yes_before, p_price_yes_after
  )
  returning id into v_trade_id;

  -- Record price snapshot
  insert into price_snapshots (market_id, price_yes, price_no)
  values (p_market_id, p_price_yes_after, 1 - p_price_yes_after);

  return jsonb_build_object(
    'trade_id',      v_trade_id,
    'balance_after', v_wallet.balance - p_cost,
    'q_yes',         p_new_q_yes,
    'q_no',          p_new_q_no
  );
end;
$$;

-- ---- execute_claim ------------------------------------------
-- Atomically claims winnings for a resolved market.
-- Verifies: market resolved, user has winning shares, not already claimed.

create or replace function execute_claim(
  p_market_id uuid,
  p_user_id   uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_market          markets%rowtype;
  v_position        positions%rowtype;
  v_wallet          wallets%rowtype;
  v_winning_shares  numeric;
  v_payout          numeric;
  v_claim_id        uuid;
begin
  select * into v_market from markets where id = p_market_id;

  if not found then
    raise exception 'market_not_found';
  end if;

  if v_market.status != 'resolved' then
    raise exception 'market_not_resolved';
  end if;

  -- Idempotency check
  if exists (
    select 1 from claims
    where market_id = p_market_id and user_id = p_user_id
  ) then
    raise exception 'already_claimed';
  end if;

  select * into v_position
  from positions
  where market_id = p_market_id and user_id = p_user_id;

  if not found then
    raise exception 'no_position';
  end if;

  v_winning_shares := case
    when v_market.outcome = 'YES' then v_position.yes_shares
    when v_market.outcome = 'NO'  then v_position.no_shares
    else 0
  end;

  if v_winning_shares <= 0 then
    raise exception 'no_winning_shares';
  end if;

  -- 1 credit per winning share
  v_payout := v_winning_shares;

  -- Lock and update wallet
  select * into v_wallet
  from wallets
  where user_id = p_user_id and group_id = v_market.group_id
  for update;

  if not found then
    raise exception 'wallet_not_found';
  end if;

  update wallets
  set balance    = balance + v_payout,
      updated_at = now()
  where id = v_wallet.id;

  -- Record claim
  insert into claims (market_id, user_id, amount)
  values (p_market_id, p_user_id, v_payout)
  returning id into v_claim_id;

  return jsonb_build_object(
    'claim_id',      v_claim_id,
    'amount',        v_payout,
    'balance_after', v_wallet.balance + v_payout
  );
end;
$$;

-- ---- join_group_via_invite ----------------------------------
-- Atomically joins a group via invite token.
-- Validates: token exists, not expired, not exhausted, not already member.
-- Creates group_member row + wallet (1000 starting credits).

create or replace function join_group_via_invite(
  p_token   text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_invite group_invites%rowtype;
  v_group  groups%rowtype;
begin
  -- Lock invite row
  select * into v_invite
  from group_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'invite_not_found';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  if v_invite.max_uses is not null and v_invite.use_count >= v_invite.max_uses then
    raise exception 'invite_exhausted';
  end if;

  if exists (
    select 1 from group_members
    where group_id = v_invite.group_id and user_id = p_user_id
  ) then
    raise exception 'already_member';
  end if;

  select * into v_group from groups where id = v_invite.group_id;

  -- Add member
  insert into group_members (group_id, user_id, role)
  values (v_invite.group_id, p_user_id, 'member');

  -- Create wallet with starting balance
  insert into wallets (user_id, group_id, balance)
  values (p_user_id, v_invite.group_id, 1000)
  on conflict (user_id, group_id) do nothing;

  -- Increment invite use count
  update group_invites
  set use_count = use_count + 1
  where id = v_invite.id;

  return jsonb_build_object(
    'group_id',   v_invite.group_id,
    'group_name', v_group.name
  );
end;
$$;

-- Grant execute to authenticated users (the functions use security definer,
-- so they run as the DB owner but can be called by authenticated users)
grant execute on function execute_trade to authenticated;
grant execute on function execute_claim to authenticated;
grant execute on function join_group_via_invite to authenticated;
