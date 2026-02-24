import { NextResponse } from "next/server";
import { requireUser, checkMembership, forbidden } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/groups/[groupId]/leaderboard
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const member = await checkMembership(groupId, user.id);
  if (!member) return forbidden();

  const supabase = createServiceClient();

  // Get all members with their wallets
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", groupId);

  const userIds = (members ?? []).map((m) => m.user_id);
  if (userIds.length === 0) return NextResponse.json({ leaderboard: [] });

  // Get wallet balances
  const { data: wallets } = await supabase
    .from("wallets")
    .select("user_id, balance")
    .eq("group_id", groupId)
    .in("user_id", userIds);

  // Get trade counts
  const { data: tradeCounts } = await supabase
    .from("trades")
    .select("user_id")
    .in("user_id", userIds);

  // Get claims (markets won = distinct markets with a claim)
  const { data: claims } = await supabase
    .from("claims")
    .select("user_id, market_id")
    .in("user_id", userIds);

  // Get display names from profiles only — never expose emails
  const displayNames: Record<string, string> = {};
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", userIds);
  for (const p of profileRows ?? []) {
    if (p.display_name) displayNames[p.id] = p.display_name;
    else if (p.username) displayNames[p.id] = `@${p.username}`;
  }
  // Fall back to anonymised user ID prefix — never email
  for (const uid of userIds) {
    if (!displayNames[uid]) displayNames[uid] = `user_${uid.slice(0, 6)}`;
  }

  const balanceMap: Record<string, number> = {};
  for (const w of wallets ?? []) balanceMap[w.user_id] = Number(w.balance);

  const tradeCountMap: Record<string, number> = {};
  for (const t of tradeCounts ?? [])
    tradeCountMap[t.user_id] = (tradeCountMap[t.user_id] ?? 0) + 1;

  const marketsWonMap: Record<string, number> = {};
  const seenClaims = new Set<string>();
  for (const c of claims ?? []) {
    const key = `${c.user_id}:${c.market_id}`;
    if (!seenClaims.has(key)) {
      seenClaims.add(key);
      marketsWonMap[c.user_id] = (marketsWonMap[c.user_id] ?? 0) + 1;
    }
  }

  const leaderboard = (members ?? [])
    .map((m) => ({
      user_id: m.user_id,
      display_name: displayNames[m.user_id] ?? m.user_id.slice(0, 8),
      balance: balanceMap[m.user_id] ?? 0,
      total_trades: tradeCountMap[m.user_id] ?? 0,
      markets_won: marketsWonMap[m.user_id] ?? 0,
    }))
    .sort((a, b) => b.balance - a.balance);

  return NextResponse.json({ leaderboard });
}
