import { NextResponse } from "next/server";
import {
  requireUser,
  checkMembership,
  forbidden,
  notFound,
  rpcError,
} from "@/lib/auth";
import { parseBody, TradeSchema } from "@/lib/validators";
import { createServiceClient } from "@/lib/supabase/service";
import {
  priceYes,
  priceNo,
  costToBuyYes,
  costToBuyNo,
  sharesForSpend,
  newQValues,
} from "@/lib/lmsr/index";

// POST /api/markets/[marketId]/trade — server-side atomic trade execution
export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const { data: body, error: validationErr } = await parseBody(request, TradeSchema);
  if (validationErr) return validationErr;

  const { outcome, spend, note } = body;

  const supabase = createServiceClient();

  // Fetch market
  const { data: market } = await supabase
    .from("markets")
    .select("*")
    .eq("id", marketId)
    .single();

  if (!market) return notFound("Market");

  // Check membership
  const member = await checkMembership(market.group_id, user.id);
  if (!member) return forbidden();

  // Server-side open/close guard
  if (market.status !== "open") return rpcError("market_not_open");
  if (new Date(market.close_time) <= new Date()) return rpcError("market_closed");

  // Wallet balance check
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .eq("group_id", market.group_id)
    .single();

  if (!wallet) return rpcError("wallet_not_found");
  if (Number(wallet.balance) < spend) return rpcError("insufficient_balance");

  // ---- LMSR math (server-side, authoritative) --------------------
  const state = {
    b: Number(market.b_liquidity),
    q_yes: Number(market.q_yes),
    q_no: Number(market.q_no),
  };

  const priceYesBefore = priceYes(state).toDecimalPlaces(6).toNumber();
  const shares = sharesForSpend(state, outcome, spend);
  const cost = (outcome === "YES"
    ? costToBuyYes(state, shares.toNumber())
    : costToBuyNo(state, shares.toNumber())
  ).toDecimalPlaces(6).toNumber();

  const { q_yes: newQYes, q_no: newQNo } = newQValues(state, outcome, shares);
  const afterState = {
    b: state.b,
    q_yes: newQYes.toNumber(),
    q_no: newQNo.toNumber(),
  };
  const priceYesAfter = priceYes(afterState).toDecimalPlaces(6).toNumber();

  // ---- Atomic DB write via RPC -----------------------------------
  const { data: result, error: rpcErr } = await supabase.rpc("execute_trade", {
    p_market_id: marketId,
    p_user_id: user.id,
    p_outcome: outcome,
    p_shares: shares.toDecimalPlaces(6).toNumber(),
    p_cost: cost,
    p_note: note,
    p_price_yes_before: priceYesBefore,
    p_price_yes_after: priceYesAfter,
    p_new_q_yes: newQYes.toDecimalPlaces(6).toNumber(),
    p_new_q_no: newQNo.toDecimalPlaces(6).toNumber(),
  });

  if (rpcErr) return rpcError(rpcErr.message);

  const res = result as {
    trade_id: string;
    balance_after: number;
  };

  return NextResponse.json({
    trade_id: res.trade_id,
    shares_bought: shares.toDecimalPlaces(4).toNumber(),
    cost,
    price_yes_after: priceYesAfter,
    price_no_after: priceNo(afterState).toDecimalPlaces(4).toNumber(),
    wallet_balance_after: Number(res.balance_after),
  });
}
