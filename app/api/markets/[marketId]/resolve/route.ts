import { NextResponse } from "next/server";
import { requireUser, checkMembership, notFound, forbidden, rpcError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { parseBody, ResolveSchema } from "@/lib/validators";

// POST /api/markets/[marketId]/resolve
export async function POST(
  request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const { data: body, error: validationErr } = await parseBody(request, ResolveSchema);
  if (validationErr) return validationErr;
  const { outcome } = body;

  const supabase = createServiceClient();

  const { data: market } = await supabase
    .from("markets")
    .select("id, creator_id, status, close_time, group_id")
    .eq("id", marketId)
    .single();

  if (!market) return notFound("Market");

  // Must still be a member of the group (handles case where creator was removed)
  const member = await checkMembership(market.group_id, user.id);
  if (!member) return forbidden();

  // Only creator can resolve
  if (market.creator_id !== user.id) {
    return NextResponse.json(
      { error: "Only the market creator can resolve" },
      { status: 403 }
    );
  }

  if (market.status === "resolved") {
    return rpcError("already_resolved");
  }

  // Mark resolved
  const { error: dbErr } = await supabase
    .from("markets")
    .update({
      status: "resolved",
      outcome,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", marketId);

  if (dbErr) {
    console.error("resolve market error:", dbErr);
    return NextResponse.json({ error: "Failed to resolve market" }, { status: 500 });
  }

  return NextResponse.json({ resolved: true, outcome });
}
