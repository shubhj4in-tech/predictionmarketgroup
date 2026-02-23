// POST /api/markets/[marketId]/trade — execute a trade
// Phase 3 implementation
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Phase 3: POST /api/markets/[marketId]/trade" }, { status: 501 });
}
