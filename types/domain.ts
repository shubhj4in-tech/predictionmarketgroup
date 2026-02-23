// ============================================================
// Domain types for Polymarket for Friends
// These mirror the DB schema and are used across the app.
// ============================================================

export type MarketStatus = "open" | "closed" | "resolved";
export type Outcome = "YES" | "NO";
export type MemberRole = "admin" | "member";

// ---- Groups ------------------------------------------------

export interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

// ---- Wallets -----------------------------------------------

export interface Wallet {
  id: string;
  user_id: string;
  group_id: string;
  balance: number; // stored as NUMERIC in DB; JS number is fine for display
  updated_at: string;
}

// ---- Markets -----------------------------------------------

export interface Market {
  id: string;
  group_id: string;
  creator_id: string;
  question: string;
  description: string | null;
  status: MarketStatus;
  outcome: Outcome | null; // set when resolved
  // LMSR state
  b_liquidity: number;
  q_yes: number;
  q_no: number;
  // Timing
  close_time: string; // ISO 8601
  resolved_at: string | null;
  created_at: string;
}

// ---- Trades ------------------------------------------------

export interface Trade {
  id: string;
  market_id: string;
  user_id: string;
  outcome: Outcome;
  shares: number;
  cost: number; // credits spent (positive) or received (negative for future sell)
  note: string; // rationale, 1–240 chars
  price_yes_before: number;
  price_yes_after: number;
  created_at: string;
}

// ---- Positions ---------------------------------------------

export interface Position {
  id: string;
  market_id: string;
  user_id: string;
  yes_shares: number;
  no_shares: number;
  updated_at: string;
}

// ---- Claims ------------------------------------------------

export interface Claim {
  id: string;
  market_id: string;
  user_id: string;
  amount: number; // credits received
  claimed_at: string;
}

// ---- Price Snapshots ---------------------------------------

export interface PriceSnapshot {
  id: string;
  market_id: string;
  price_yes: number;
  price_no: number;
  created_at: string;
}

// ---- Group Invites -----------------------------------------

export interface GroupInvite {
  id: string;
  group_id: string;
  token: string; // URL-safe random string
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

// ---- Computed / View types --------------------------------

export interface MarketWithPrices extends Market {
  price_yes: number;
  price_no: number;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  balance: number;
  total_trades: number;
  markets_won: number;
}
