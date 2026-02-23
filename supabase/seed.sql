-- ============================================================
-- Seed data for local development / testing
--
-- Usage:
--   1. Sign up two users in your Supabase project (via /signin)
--   2. Replace the UUIDs below with real user IDs from auth.users
--   3. Run this in the Supabase SQL Editor
-- ============================================================

-- NOTE: Replace these with actual user IDs from your auth.users table
-- SELECT id, email FROM auth.users;
DO $$
DECLARE
  user1_id uuid := '00000000-0000-0000-0000-000000000001'; -- replace me
  user2_id uuid := '00000000-0000-0000-0000-000000000002'; -- replace me
  group1_id uuid := gen_random_uuid();
  market1_id uuid := gen_random_uuid();
  market2_id uuid := gen_random_uuid();
  invite_token text := 'demo-invite-token-replace-me';
BEGIN
  -- Group
  INSERT INTO groups (id, name, description, created_by)
  VALUES (group1_id, 'CS106B Friends', 'Stanford CS106B prediction markets', user1_id)
  ON CONFLICT DO NOTHING;

  -- Members
  INSERT INTO group_members (group_id, user_id, role) VALUES
    (group1_id, user1_id, 'admin'),
    (group1_id, user2_id, 'member')
  ON CONFLICT DO NOTHING;

  -- Wallets
  INSERT INTO wallets (user_id, group_id, balance) VALUES
    (user1_id, group1_id, 950),
    (user2_id, group1_id, 1050)
  ON CONFLICT DO NOTHING;

  -- Markets
  INSERT INTO markets (id, group_id, creator_id, question, description, b_liquidity, q_yes, q_no, close_time, status)
  VALUES
  (
    market1_id,
    group1_id,
    user1_id,
    'Will Shubh get an A in CS106B this quarter?',
    'Resolves YES if Shubh receives an A or A+ in CS106B at Stanford.',
    50,
    15.3,
    5.1,
    (now() + interval '30 days')::timestamptz,
    'open'
  ),
  (
    market2_id,
    group1_id,
    user2_id,
    'Will the CS106B final be harder than the midterm?',
    'Based on average score on each exam.',
    50,
    0,
    0,
    (now() + interval '60 days')::timestamptz,
    'open'
  )
  ON CONFLICT DO NOTHING;

  -- Trades on market 1
  INSERT INTO trades (market_id, user_id, outcome, shares, cost, note, price_yes_before, price_yes_after)
  VALUES
  (
    market1_id, user1_id, 'YES', 10.5, 30.0,
    'Shubh is crushing the assignments, definitely getting an A.',
    0.5, 0.69
  ),
  (
    market2_id, user2_id, 'NO', 5.2, 20.0,
    'I think the NO side is underpriced here.',
    0.5, 0.31
  )
  ON CONFLICT DO NOTHING;

  -- Positions
  INSERT INTO positions (market_id, user_id, yes_shares, no_shares) VALUES
    (market1_id, user1_id, 10.5, 0)
  ON CONFLICT DO NOTHING;

  -- Price snapshots
  INSERT INTO price_snapshots (market_id, price_yes, price_no) VALUES
    (market1_id, 0.5, 0.5),
    (market1_id, 0.69, 0.31)
  ON CONFLICT DO NOTHING;

  -- Invite
  INSERT INTO group_invites (group_id, token, created_by)
  VALUES (group1_id, invite_token, user1_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed complete. Group ID: %, Market 1: %, Market 2: %', group1_id, market1_id, market2_id;
END $$;
