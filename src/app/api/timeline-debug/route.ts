import { NextResponse } from "next/server";
import { createStaticClient } from "@/lib/supabase/static";

export const dynamic = "force-dynamic";

const COLS = "id,institution,title,date,culture,medium,image_url,thumbnail_url,image_width,image_height,department,artist_name,credit_line,dimensions,object_url,year_begin,year_end";

export async function GET() {
  const supabase = createStaticClient();

  const t1 = Date.now();
  const { data: seededRows, error } = await supabase
    .from("objects_cache")
    .select(COLS)
    .not("thumbnail_url", "is", null)
    .not("year_begin", "is", null)
    .neq("institution", "harvard")
    .neq("institution", "colbase")
    .gte("year_begin", -7000)
    .lte("year_begin", 2026)
    .order("year_begin")
    .limit(40000);
  const t2 = Date.now();

  return NextResponse.json({
    main_query_ms: t2 - t1,
    rows_returned: seededRows?.length ?? 0,
    error: error?.message ?? null,
  });
}
