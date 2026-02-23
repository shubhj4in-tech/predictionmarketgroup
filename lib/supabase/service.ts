import { createClient } from "@supabase/supabase-js";

// Service-role client for server-side privileged operations (trade execution, etc.)
// NEVER expose this client to the browser.
// Uses untyped client for now — replace with `supabase gen types typescript` output
// once the Supabase project is configured.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
