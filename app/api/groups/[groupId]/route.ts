import { NextResponse } from "next/server";
import { requireUser, checkMembership, forbidden, notFound } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/groups/[groupId] — group detail (name, description, member count)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const { user, error } = await requireUser();
  if (error) return error;

  const member = await checkMembership(groupId, user.id);
  if (!member) return forbidden();

  const supabase = createServiceClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, created_by, created_at")
    .eq("id", groupId)
    .single();

  if (!group) return notFound("Group");

  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  // Fetch wallet for this user in this group
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .single();

  return NextResponse.json({
    id: group.id,
    name: group.name,
    description: group.description,
    created_by: group.created_by,
    created_at: group.created_at,
    member_count: count ?? 0,
    my_balance: wallet?.balance ?? 0,
    my_role: member.role,
  });
}
