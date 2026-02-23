import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client for server-side privileged operations (trade execution, etc.)
// NEVER expose this client to the browser.
export function createServiceClient() {
  return createClient<Database>(
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
