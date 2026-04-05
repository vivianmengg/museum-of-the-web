import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { username, is_anonymous } = await request.json();

  if (!is_anonymous && (!username?.trim() || username.trim().length < 2)) {
    return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
  }
  if (!is_anonymous && username.trim().length > 32) {
    return NextResponse.json({ error: "Username must be 32 characters or less" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({
      username: is_anonymous ? `visitor_${user.id.slice(0, 6)}` : username.trim(),
      is_anonymous,
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
