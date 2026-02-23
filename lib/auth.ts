import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

type RouteContext = {
  params?: Record<string, string>;
};

/** Returns the authenticated user or null. */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Returns the user or a 401 JSON response. */
export async function requireUser(): Promise<
  { user: User; error: null } | { user: null; error: NextResponse }
> {
  const user = await getUser();
  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null };
}

/** Checks group membership. Returns member data or null. */
export async function checkMembership(
  groupId: string,
  userId: string
): Promise<{ role: string } | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single();
  return data;
}

/** Returns a 403 response for non-members. */
export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** Returns a 404 response. */
export function notFound(resource = "Resource"): NextResponse {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

/** Returns a 400 bad request response. */
export function badRequest(message: string, code?: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

/** Returns a 409 conflict response. */
export function conflict(message: string, code?: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status: 409 });
}

/** Wraps a Supabase RPC error code into a clean HTTP response. */
export function rpcError(message: string): NextResponse {
  const code = message.toLowerCase().replace(/\s+/g, "_");
  const statusMap: Record<string, number> = {
    market_not_found: 404,
    market_not_open: 409,
    market_closed: 409,
    market_not_resolved: 409,
    wallet_not_found: 500,
    insufficient_balance: 409,
    already_claimed: 409,
    no_position: 409,
    no_winning_shares: 409,
    invite_not_found: 404,
    invite_expired: 409,
    invite_exhausted: 409,
    already_member: 409,
  };
  const status = statusMap[code] ?? 500;
  return NextResponse.json({ error: message, code }, { status });
}

export type { RouteContext };
