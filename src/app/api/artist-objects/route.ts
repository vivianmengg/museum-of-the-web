import { createStaticClient } from "@/lib/supabase/static";
import { NextResponse } from "next/server";

const PAGE_SIZE = 200;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const page = parseInt(searchParams.get("page") ?? "0", 10);

  if (!name) return NextResponse.json({ objects: [], total: 0 });

  const supabase = createStaticClient();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await supabase
    .from("objects_cache")
    .select("*", { count: "exact" })
    .eq("artist_name", name)
    .not("thumbnail_url", "is", null)
    .order("date")
    .range(from, to);

  if (error) return NextResponse.json({ objects: [], total: 0 }, { status: 500 });

  return NextResponse.json({ objects: data ?? [], total: count ?? 0 });
}
