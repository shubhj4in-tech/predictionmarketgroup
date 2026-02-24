import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

// GET /api/me/profile
export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, updated_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    email: user.email,
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
  });
}

// PATCH /api/me/profile
export async function PATCH(request: Request) {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const display_name = typeof body.display_name === "string" ? body.display_name.trim() : undefined;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined;

  if (display_name !== undefined && display_name.length > 60) {
    return NextResponse.json({ error: "Display name must be 60 characters or less" }, { status: 400 });
  }
  if (username && !/^[a-z0-9_]{1,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, and underscores (max 30 chars)" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { error: upsertErr } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      ...(display_name !== undefined && { display_name }),
      ...(username !== undefined && { username }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertErr) {
    const msg = upsertErr.message.includes("unique")
      ? "Username already taken"
      : upsertErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
