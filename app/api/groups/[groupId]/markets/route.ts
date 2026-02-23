// POST /api/groups/[groupId]/markets — create market
// GET  /api/groups/[groupId]/markets — list markets for group
// Phase 3 implementation
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Phase 3: GET /api/groups/[groupId]/markets" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ message: "Phase 3: POST /api/groups/[groupId]/markets" }, { status: 501 });
}
