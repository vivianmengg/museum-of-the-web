import { createClient } from "@supabase/supabase-js";

// Cookie-free client for use in statically cached pages (ISR).
// Does NOT read cookies — safe to call from server components that need caching.
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
