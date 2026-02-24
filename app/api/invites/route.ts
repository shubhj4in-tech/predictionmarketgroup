import { NextResponse } from "next/server";
import { requireUser, checkMembership, forbidden, badRequest } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import crypto from "crypto";

// Generates a short human-friendly join code (e.g. "X7KM2P")
// Excludes ambiguous chars: 0/O, 1/I/L
const CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateCode(): string {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes)
    .map((b) => CODE_CHARSET[b % CODE_CHARSET.length])
    .join("");
}

// POST /api/invites — create an invite link (admin only)
export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.group_id) return badRequest("group_id is required");

  const member = await checkMembership(body.group_id, user.id);
  if (!member) return forbidden();
  if (member.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can create invite links" },
      { status: 403 }
    );
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const code = generateCode();
  const expiresInHours =
    typeof body.expires_in_hours === "number" ? body.expires_in_hours : null;
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()
    : null;
  const maxUses =
    typeof body.max_uses === "number" && body.max_uses > 0
      ? body.max_uses
      : null;

  const supabase = createServiceClient();

  const { data: invite, error: dbErr } = await supabase
    .from("group_invites")
    .insert({
      group_id: body.group_id,
      token,
      code,
      created_by: user.id,
      expires_at: expiresAt,
      max_uses: maxUses,
    })
    .select("token, code, expires_at")
    .single();

  if (dbErr || !invite) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({
    token: invite.token,
    code: invite.code,
    invite_url: `${appUrl}/invite/${invite.token}`,
    expires_at: invite.expires_at,
  });
}
