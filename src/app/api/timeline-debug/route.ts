import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createStaticClient();
  const start = Date.now();

  const { data, error, count } = await supabase
    .from("objects_cache")
    .select("id", { count: "exact" })
    .not("thumbnail_url", "is", null)
    .not("year_begin", "is", null)
    .neq("institution", "harvard")
    .neq("institution", "colbase")
    .gte("year_begin", -7000)
    .lte("year_begin", 2026)
    .limit(1);

  return NextResponse.json({
    elapsed_ms: Date.now() - start,
    count,
    error: error?.message ?? null,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}
