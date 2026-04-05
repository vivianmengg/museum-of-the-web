import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json();
  const { title, statement, objects } = body as {
    title: string;
    statement?: string;
    objects: Array<{ object_id: string; institution: string; curator_note?: string }>;
  };

  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });

  // Ensure public.users row exists (may be missing if schema was set up after first sign-in)
  const { error: upsertError } = await supabase.from("users").upsert(
    {
      id: user.id,
      username: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "visitor",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
  if (upsertError) return NextResponse.json({ error: `Profile error: ${upsertError.message}` }, { status: 500 });

  // Create the exhibit
  const { data: exhibit, error: exhibitError } = await supabase
    .from("exhibits")
    .insert({ user_id: user.id, title: title.trim(), statement: statement?.trim() ?? null, is_public: true })
    .select()
    .single();

  if (exhibitError) return NextResponse.json({ error: exhibitError.message }, { status: 500 });

  // Insert objects
  if (objects?.length > 0) {
    const { error: objError } = await supabase.from("exhibit_objects").insert(
      objects.map((o, i) => ({
        exhibit_id: exhibit.id,
        object_id: o.object_id,
        institution: o.institution,
        curator_note: o.curator_note ?? null,
        position: i,
      }))
    );

    if (objError) {
      await supabase.from("exhibits").delete().eq("id", exhibit.id);
      return NextResponse.json({ error: objError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: exhibit.id }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("exhibits")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, is_public } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("exhibits")
    .update({ is_public })
    .eq("id", id)
    .eq("user_id", user.id); // RLS + ownership check

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const supabase = await createClient();

  // Fetch single exhibit by id
  if (id) {
    const { data, error } = await supabase
      .from("exhibits")
      .select("*, users(username), exhibit_objects(object_id, institution, curator_note, position)")
      .eq("id", id)
      .single();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  }

  // Fetch all exhibits for the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from("exhibits")
    .select("*, exhibit_objects(object_id, institution, curator_note, position)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
