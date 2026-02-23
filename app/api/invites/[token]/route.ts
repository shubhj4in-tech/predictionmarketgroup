// POST /api/invites/[token] — accept an invite (join group)
// Phase 5 implementation
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "Phase 5: POST /api/invites/[token]" }, { status: 501 });
}
