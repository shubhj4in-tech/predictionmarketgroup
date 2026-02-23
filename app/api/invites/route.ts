// POST /api/invites — create invite link for a group
// Phase 5 implementation
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Phase 5: POST /api/invites" }, { status: 501 });
}
