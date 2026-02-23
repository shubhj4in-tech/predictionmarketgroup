// ============================================================
// API Request / Response contracts
// These define the exact shapes for all route handlers.
// ============================================================

import type { Outcome } from "./domain";

// ---- Generic -----------------------------------------------

export interface ApiError {
  error: string;
  code?: string;
}

// HTTP error codes used across the API:
//   400 BAD_REQUEST        — invalid input / validation failure
//   401 UNAUTHORIZED       — not signed in
//   403 FORBIDDEN          — signed in but not allowed (not a member, etc.)
//   404 NOT_FOUND          — resource doesn't exist
//   409 CONFLICT           — duplicate / business rule violation (already claimed, etc.)
//   500 INTERNAL_ERROR     — unexpected server error

// ---- POST /api/groups --------------------------------------

export interface CreateGroupRequest {
  name: string;       // 2–80 chars
  description?: string; // max 500 chars
}

export interface CreateGroupResponse {
  group_id: string;
  invite_token: string; // auto-created first invite link
}

// ---- GET /api/groups ---------------------------------------

export interface ListGroupsResponse {
  groups: {
    id: string;
    name: string;
    description: string | null;
    member_count: number;
    created_at: string;
  }[];
}

// ---- POST /api/groups/[groupId]/markets --------------------

export interface CreateMarketRequest {
  question: string;       // 10–200 chars
  description?: string;   // max 1000 chars
  close_time: string;     // ISO 8601; must be in the future
  b_liquidity?: number;   // default: 50 credits
}

export interface CreateMarketResponse {
  market_id: string;
}

// ---- GET /api/groups/[groupId]/markets ---------------------

export interface ListMarketsResponse {
  markets: {
    id: string;
    question: string;
    status: string;
    price_yes: number;
    price_no: number;
    close_time: string;
    trade_count: number;
    created_at: string;
  }[];
}

// ---- GET /api/markets/[marketId] ---------------------------

export interface GetMarketResponse {
  id: string;
  group_id: string;
  question: string;
  description: string | null;
  status: string;
  outcome: Outcome | null;
  price_yes: number;
  price_no: number;
  b_liquidity: number;
  q_yes: number;
  q_no: number;
  close_time: string;
  resolved_at: string | null;
  created_at: string;
  creator_id: string;
  trades: TradeItem[];
  my_position: {
    yes_shares: number;
    no_shares: number;
  } | null;
  my_claim: {
    amount: number;
    claimed_at: string;
  } | null;
  price_history: {
    price_yes: number;
    created_at: string;
  }[];
}

export interface TradeItem {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  outcome: Outcome;
  shares: number;
  cost: number;
  note: string;
  price_yes_after: number;
  created_at: string;
}

// ---- POST /api/markets/[marketId]/trade --------------------

export interface TradeRequest {
  outcome: Outcome;   // "YES" | "NO"
  spend: number;      // credits to spend; must be > 0 and <= wallet balance
  note: string;       // rationale, 1–240 chars
}

export interface TradeResponse {
  trade_id: string;
  shares_bought: number;
  cost: number;
  price_yes_after: number;
  price_no_after: number;
  wallet_balance_after: number;
}

// ---- POST /api/markets/[marketId]/resolve ------------------

export interface ResolveMarketRequest {
  outcome: Outcome; // "YES" | "NO"
}

export interface ResolveMarketResponse {
  resolved: true;
  outcome: Outcome;
}

// ---- POST /api/claims/[marketId] ---------------------------

// (no request body needed — user identity from session)

export interface ClaimResponse {
  claim_id: string;
  amount: number;
  wallet_balance_after: number;
}

// ---- POST /api/invites -------------------------------------

export interface CreateInviteRequest {
  group_id: string;
  expires_in_hours?: number; // null = never expires; default: 72h
  max_uses?: number;         // null = unlimited
}

export interface CreateInviteResponse {
  token: string;
  invite_url: string;
  expires_at: string | null;
}

// ---- POST /api/invites/[token] (accept invite) -------------

// (no request body; user identity from session)

export interface AcceptInviteResponse {
  group_id: string;
  group_name: string;
}
