import { NextResponse } from "next/server";
import { requireUser, rpcError } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/invites/[token] — preview invite (group name, member count)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: invite } = await supabase
    .from("group_invites")
    .select("group_id, expires_at, max_uses, use_count")
    .eq("token", token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return NextResponse.json({ error: "Invite exhausted" }, { status: 410 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description")
    .eq("id", invite.group_id)
    .single();

  const { count: memberCount } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", invite.group_id);

  return NextResponse.json({
    group_id: invite.group_id,
    group_name: group?.name ?? "",
    group_description: group?.description ?? null,
    member_count: memberCount ?? 0,
    expires_at: invite.expires_at,
  });
}

// POST /api/invites/[token] — accept invite (join group)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const supabase = createServiceClient();

  const { data: result, error: rpcErr } = await supabase.rpc(
    "join_group_via_invite",
    {
      p_token: token,
      p_user_id: user.id,
    }
  );

  if (rpcErr) {
    return rpcError(rpcErr.message);
  }

  const res = result as { group_id: string; group_name: string };
  return NextResponse.json({
    group_id: res.group_id,
    group_name: res.group_name,
  });
}
