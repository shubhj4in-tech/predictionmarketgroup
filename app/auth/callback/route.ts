import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Supabase redirects here after magic link / OAuth sign-in (PKCE flow).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/groups";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_failed`);
}
