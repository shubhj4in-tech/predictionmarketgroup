// POST /api/claims/[marketId] — claim winnings
// Phase 3 implementation
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Phase 3: POST /api/claims/[marketId]" }, { status: 501 });
}
