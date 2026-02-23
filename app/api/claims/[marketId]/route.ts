import { NextResponse } from "next/server";
import { requireUser, checkMembership, forbidden, notFound, rpcError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

// POST /api/claims/[marketId] — claim winnings
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const supabase = createServiceClient();

  const { data: market } = await supabase
    .from("markets")
    .select("id, group_id, status")
    .eq("id", marketId)
    .single();

  if (!market) return notFound("Market");

  const member = await checkMembership(market.group_id, user.id);
  if (!member) return forbidden();

  if (market.status !== "resolved") {
    return rpcError("market_not_resolved");
  }

  const { data: result, error: rpcErr } = await supabase.rpc("execute_claim", {
    p_market_id: marketId,
    p_user_id: user.id,
  });

  if (rpcErr) {
    return rpcError(rpcErr.message);
  }

  const res = result as {
    claim_id: string;
    amount: number;
    balance_after: number;
  };

  return NextResponse.json({
    claim_id: res.claim_id,
    amount: Number(res.amount),
    wallet_balance_after: Number(res.balance_after),
  });
}
