import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";
  // Prevent redirect loops back to /auth
  const next = rawNext.startsWith("/auth") ? "/" : rawNext;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Upsert public.users row — ignoreDuplicates so existing profiles aren't overwritten
      await supabase.from("users").upsert(
        {
          id: data.user.id,
          username:
            data.user.user_metadata?.full_name ??
            data.user.email?.split("@")[0] ??
            "visitor",
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );

      // Check if user has completed onboarding — if not, send to setup
      const { data: profile } = await supabase
        .from("users")
        .select("onboarded")
        .eq("id", data.user.id)
        .single();

      if (!profile?.onboarded) {
        const setupUrl = new URL(`${origin}/setup`);
        if (next !== "/") setupUrl.searchParams.set("next", next);
        return NextResponse.redirect(setupUrl.toString());
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`);
}
