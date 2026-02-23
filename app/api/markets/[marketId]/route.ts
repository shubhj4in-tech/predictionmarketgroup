// GET /api/markets/[marketId] — fetch market detail
// Phase 3 implementation
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Phase 3: GET /api/markets/[marketId]" }, { status: 501 });
}
