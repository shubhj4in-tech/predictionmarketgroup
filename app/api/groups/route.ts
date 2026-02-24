import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { parseBody, CreateGroupSchema } from "@/lib/validators";
import crypto from "crypto";

// GET /api/groups — list the authenticated user's groups
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const supabase = createServiceClient();

  const { data, error: dbErr } = await supabase
    .from("group_members")
    .select(
      `
      role,
      joined_at,
      groups (
        id, name, description, created_by, created_at
      )
    `
    )
    .eq("user_id", user.id);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  type GroupRow = { id: string; name: string; description: string | null; created_at: string };
  // Supabase returns many-to-one joins as an object, not an array
  type RawMember = { role: string; joined_at: string; groups: GroupRow | GroupRow[] | null };
  const rows = (data ?? []) as unknown as RawMember[];

  const extractGroup = (m: RawMember): GroupRow | null => {
    if (!m.groups) return null;
    return Array.isArray(m.groups) ? (m.groups[0] ?? null) : m.groups;
  };

  // Count members per group
  const groupIds = rows.map((m) => extractGroup(m)?.id).filter(Boolean) as string[];

  const memberCounts: Record<string, number> = {};
  if (groupIds.length > 0) {
    const { data: counts } = await supabase
      .from("group_members")
      .select("group_id")
      .in("group_id", groupIds);
    for (const row of (counts ?? []) as { group_id: string }[]) {
      memberCounts[row.group_id] = (memberCounts[row.group_id] ?? 0) + 1;
    }
  }

  const groups = rows
    .map((m) => {
      const g = extractGroup(m);
      if (!g?.id) return null;
      return {
        id: g.id,
        name: g.name,
        description: g.description ?? null,
        member_count: memberCounts[g.id] ?? 0,
        created_at: g.created_at,
        role: m.role,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ groups });
}

// POST /api/groups — create a new group
export async function POST(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const { data: body, error: validationErr } = await parseBody(request, CreateGroupSchema);
  if (validationErr) return validationErr;

  const { name, description = null } = body;

  const supabase = createServiceClient();

  // Create group
  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .insert({ name, description, created_by: user.id })
    .select("id")
    .single();

  if (groupErr || !group) {
    return NextResponse.json(
      { error: groupErr?.message ?? "Failed to create group" },
      { status: 500 }
    );
  }

  // Add creator as admin
  await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });

  // Create wallet for creator (1000 starting credits)
  await supabase
    .from("wallets")
    .insert({ user_id: user.id, group_id: group.id, balance: 1000 });

  // Create first invite link
  const token = crypto.randomBytes(24).toString("base64url");
  await supabase.from("group_invites").insert({
    group_id: group.id,
    token,
    created_by: user.id,
    expires_at: null,
    max_uses: null,
  });

  return NextResponse.json({ group_id: group.id, invite_token: token });
}
