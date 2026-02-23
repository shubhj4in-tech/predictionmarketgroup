import { NextResponse } from "next/server";
import { requireUser, checkMembership, forbidden, notFound } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { priceYes, priceNo } from "@/lib/lmsr";

// GET /api/markets/[marketId] — full market detail
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const supabase = createServiceClient();

  const { data: market } = await supabase
    .from("markets")
    .select("*")
    .eq("id", marketId)
    .single();

  if (!market) return notFound("Market");

  const member = await checkMembership(market.group_id, user.id);
  if (!member) return forbidden();

  const state = {
    b: market.b_liquidity,
    q_yes: market.q_yes,
    q_no: market.q_no,
  };

  // Recent trades with user emails
  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false })
    .limit(50);

  // Get user emails for trades
  const traderIds = [...new Set((trades ?? []).map((t) => t.user_id))];
  const traderEmails: Record<string, string> = {};
  if (traderIds.length > 0) {
    try {
      const { data: usersData } =
        await supabase.auth.admin.listUsers();
      for (const u of usersData?.users ?? []) {
        traderEmails[u.id] = u.email ?? u.id.slice(0, 8);
      }
    } catch {
      for (const uid of traderIds) traderEmails[uid] = uid.slice(0, 8);
    }
  }

  // My position
  const { data: position } = await supabase
    .from("positions")
    .select("yes_shares, no_shares")
    .eq("market_id", marketId)
    .eq("user_id", user.id)
    .single();

  // My claim
  const { data: claim } = await supabase
    .from("claims")
    .select("amount, claimed_at")
    .eq("market_id", marketId)
    .eq("user_id", user.id)
    .single();

  // Price history (last 100 snapshots)
  const { data: priceHistory } = await supabase
    .from("price_snapshots")
    .select("price_yes, created_at")
    .eq("market_id", marketId)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({
    id: market.id,
    group_id: market.group_id,
    question: market.question,
    description: market.description,
    status: market.status,
    outcome: market.outcome,
    price_yes: priceYes(state).toDecimalPlaces(4).toNumber(),
    price_no: priceNo(state).toDecimalPlaces(4).toNumber(),
    b_liquidity: market.b_liquidity,
    q_yes: market.q_yes,
    q_no: market.q_no,
    close_time: market.close_time,
    resolved_at: market.resolved_at,
    created_at: market.created_at,
    creator_id: market.creator_id,
    trades: (trades ?? []).map((t) => ({
      id: t.id,
      user_id: t.user_id,
      display_name: traderEmails[t.user_id] ?? t.user_id.slice(0, 8),
      outcome: t.outcome,
      shares: t.shares,
      cost: t.cost,
      note: t.note,
      price_yes_after: t.price_yes_after,
      created_at: t.created_at,
    })),
    my_position: position
      ? { yes_shares: position.yes_shares, no_shares: position.no_shares }
      : null,
    my_claim: claim ? { amount: claim.amount, claimed_at: claim.claimed_at } : null,
    price_history: (priceHistory ?? []).map((s) => ({
      price_yes: s.price_yes,
      created_at: s.created_at,
    })),
  });
}
