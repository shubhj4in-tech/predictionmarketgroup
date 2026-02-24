import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { priceYes, priceNo } from "@/lib/lmsr";

// GET /api/me/activity — open markets in user's groups + past resolved bets the user participated in
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // User's group IDs
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);
  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) {
    return NextResponse.json({ open_markets: [], past_bets: [] });
  }

  // Group names
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .in("id", groupIds);
  const groupNames: Record<string, string> = {};
  for (const g of groups ?? []) groupNames[g.id] = g.name ?? "";

  // Open markets in user's groups (status=open, close_time > now)
  const { data: openMarkets } = await supabase
    .from("markets")
    .select("id, group_id, question, b_liquidity, q_yes, q_no, close_time")
    .in("group_id", groupIds)
    .eq("status", "open")
    .gt("close_time", now)
    .order("close_time", { ascending: true });

  // User's positions for those markets
  const openMarketIds = (openMarkets ?? []).map((m) => m.id);
  let positionsByMarket: Record<string, { yes_shares: number; no_shares: number }> = {};
  if (openMarketIds.length > 0) {
    const { data: positions } = await supabase
      .from("positions")
      .select("market_id, yes_shares, no_shares")
      .eq("user_id", user.id)
      .in("market_id", openMarketIds);
    for (const p of positions ?? []) {
      positionsByMarket[p.market_id] = {
        yes_shares: Number(p.yes_shares),
        no_shares: Number(p.no_shares),
      };
    }
  }

  const open_markets = (openMarkets ?? []).map((m) => {
    const state = { b: m.b_liquidity, q_yes: m.q_yes, q_no: m.q_no };
    const pos = positionsByMarket[m.id];
    const i_participated =
      (pos?.yes_shares ?? 0) > 0 || (pos?.no_shares ?? 0) > 0;
    return {
      id: m.id,
      group_id: m.group_id,
      group_name: groupNames[m.group_id] ?? "",
      question: m.question,
      price_yes: priceYes(state).toDecimalPlaces(4).toNumber(),
      close_time: m.close_time,
      i_participated,
    };
  });

  // Past bets: resolved markets where user has a position
  const { data: userPositions } = await supabase
    .from("positions")
    .select("market_id, yes_shares, no_shares")
    .eq("user_id", user.id);
  const marketIdsWithPosition = (userPositions ?? [])
    .filter((p) => Number(p.yes_shares) > 0 || Number(p.no_shares) > 0)
    .map((p) => p.market_id);
  if (marketIdsWithPosition.length === 0) {
    return NextResponse.json({ open_markets, past_bets: [] });
  }

  const { data: resolvedMarkets } = await supabase
    .from("markets")
    .select("id, group_id, question, outcome, resolved_at")
    .in("id", marketIdsWithPosition)
    .eq("status", "resolved");

  const { data: claims } = await supabase
    .from("claims")
    .select("market_id, amount, claimed_at")
    .eq("user_id", user.id)
    .in("market_id", marketIdsWithPosition);
  const claimsByMarket: Record<string, { amount: number; claimed_at: string }> = {};
  for (const c of claims ?? []) {
    claimsByMarket[c.market_id] = {
      amount: Number(c.amount),
      claimed_at: c.claimed_at,
    };
  }

  const posMap: Record<string, { yes_shares: number; no_shares: number }> = {};
  for (const p of userPositions ?? []) {
    posMap[p.market_id] = {
      yes_shares: Number(p.yes_shares),
      no_shares: Number(p.no_shares),
    };
  }

  const past_bets = (resolvedMarkets ?? []).map((m) => {
    const pos = posMap[m.id] ?? { yes_shares: 0, no_shares: 0 };
    const outcome = m.outcome as "YES" | "NO" | null;
    const winningShares =
      outcome === "YES" ? pos.yes_shares : outcome === "NO" ? pos.no_shares : 0;
    const result =
      winningShares > 0 ? "won" : pos.yes_shares > 0 || pos.no_shares > 0 ? "lost" : "no_position";
    const claim = claimsByMarket[m.id];
    return {
      id: m.id,
      group_id: m.group_id,
      group_name: groupNames[m.group_id] ?? "",
      question: m.question,
      outcome,
      resolved_at: m.resolved_at,
      my_yes_shares: pos.yes_shares,
      my_no_shares: pos.no_shares,
      result,
      claimed_at: claim?.claimed_at ?? null,
      claimed_amount: claim?.amount ?? null,
    };
  });

  // Sort past bets by resolved_at desc
  past_bets.sort((a, b) => {
    const t1 = a.resolved_at ? new Date(a.resolved_at).getTime() : 0;
    const t2 = b.resolved_at ? new Date(b.resolved_at).getTime() : 0;
    return t2 - t1;
  });

  return NextResponse.json({ open_markets, past_bets });
}
