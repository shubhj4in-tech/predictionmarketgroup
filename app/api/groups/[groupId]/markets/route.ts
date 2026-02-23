import { NextResponse } from "next/server";
import { requireUser, checkMembership, forbidden } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { priceYes, priceNo } from "@/lib/lmsr/index";
import { parseBody, CreateMarketSchema } from "@/lib/validators";

// GET /api/groups/[groupId]/markets — list markets for a group
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

  const { data: markets, error: dbErr } = await supabase
    .from("markets")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  // Get trade counts
  const marketIds = (markets ?? []).map((m) => m.id);
  const tradeCounts: Record<string, number> = {};
  if (marketIds.length > 0) {
    const { data: counts } = await supabase
      .from("trades")
      .select("market_id")
      .in("market_id", marketIds);
    for (const row of counts ?? []) {
      tradeCounts[row.market_id] = (tradeCounts[row.market_id] ?? 0) + 1;
    }
  }

  const result = (markets ?? []).map((m) => {
    const state = { b: m.b_liquidity, q_yes: m.q_yes, q_no: m.q_no };
    return {
      id: m.id,
      question: m.question,
      status: m.status,
      outcome: m.outcome,
      price_yes: priceYes(state).toDecimalPlaces(4).toNumber(),
      price_no: priceNo(state).toDecimalPlaces(4).toNumber(),
      close_time: m.close_time,
      created_at: m.created_at,
      trade_count: tradeCounts[m.id] ?? 0,
    };
  });

  return NextResponse.json({ markets: result });
}

// POST /api/groups/[groupId]/markets — create a new market
export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const member = await checkMembership(groupId, user.id);
  if (!member) return forbidden();

  const { data: body, error: validationErr } = await parseBody(request, CreateMarketSchema);
  if (validationErr) return validationErr;

  const { question, description = null, close_time, b_liquidity: bLiquidity = 50 } = body;
  const closeTime = new Date(close_time);

  const supabase = createServiceClient();

  const { data: market, error: dbErr } = await supabase
    .from("markets")
    .insert({
      group_id: groupId,
      creator_id: user.id,
      question,
      description,
      b_liquidity: bLiquidity,
      q_yes: 0,
      q_no: 0,
      close_time: closeTime.toISOString(),
      status: "open",
    })
    .select("id")
    .single();

  if (dbErr || !market) {
    return NextResponse.json(
      { error: dbErr?.message ?? "Failed to create market" },
      { status: 500 }
    );
  }

  return NextResponse.json({ market_id: market.id }, { status: 201 });
}
