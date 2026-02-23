// POST /api/groups — create group
// GET  /api/groups — list user's groups
// Phase 3 implementation
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Phase 3: GET /api/groups" }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ message: "Phase 3: POST /api/groups" }, { status: 501 });
}
