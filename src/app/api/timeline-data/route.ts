import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";
import { rowToTimelineObject } from "@/lib/timeline";

export const revalidate = 3600;

const COLS = "id,institution,title,date,culture,medium,image_url,thumbnail_url,image_width,image_height,department,artist_name,credit_line,dimensions,object_url,year_begin,year_end";

export async function GET() {
  const supabase = createStaticClient();

  const [
    { data: seededRows, error: seededError },
    { data: harvardRows },
    { data: browseRows },
  ] = await Promise.all([
    supabase.from("objects_cache").select(COLS)
      .not("thumbnail_url", "is", null).not("year_begin", "is", null)
      .neq("institution", "harvard").neq("institution", "colbase")
      .gte("year_begin", -7000).lte("year_begin", 2026)
      .order("year_begin").limit(40000),
    supabase.from("objects_cache").select(COLS)
      .not("thumbnail_url", "is", null).not("year_begin", "is", null)
      .eq("institution", "harvard")
      .gte("year_begin", -7000).lte("year_begin", -1500)
      .order("year_begin").limit(500),
    supabase.from("objects_cache").select(COLS)
      .not("thumbnail_url", "is", null)
      .neq("institution", "harvard").neq("institution", "colbase")
      .is("year_begin", null).neq("date", "").limit(5000),
  ]);

  // If the main query errored, return 503 — Next.js won't cache error responses,
  // so the next request will try fresh.
  if (seededError) {
    return NextResponse.json({ error: seededError.message }, { status: 503 });
  }

  const rows = [
    ...(seededRows ?? []),
    ...(harvardRows ?? []),
    ...(browseRows  ?? []),
  ] as Record<string, unknown>[];

  const timelineObjects = rows.flatMap(row => {
    const obj = rowToTimelineObject(row);
    return obj ? [obj] : [];
  });

  return NextResponse.json(timelineObjects);
}
