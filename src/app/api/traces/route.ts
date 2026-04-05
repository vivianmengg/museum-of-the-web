import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const objectId = searchParams.get("object_id");
  if (!objectId) return NextResponse.json({ error: "object_id required" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("traces")
    .select("*, users(username, avatar_url, is_anonymous)")
    .eq("object_id", objectId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Ensure public.users row exists
  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: user.id,
      username: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "visitor",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (upsertError) return NextResponse.json({ error: `Profile error: ${upsertError.message}` }, { status: 500 });

  const body = await request.json();
  const { object_id, institution, text } = body;
  if (!object_id || !institution || !text?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (text.length > 280) {
    return NextResponse.json({ error: "Text too long (max 280 chars)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("traces")
    .insert({ user_id: user.id, object_id, institution, text: text.trim() })
    .select("*, users(username, avatar_url, is_anonymous)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("traces")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
