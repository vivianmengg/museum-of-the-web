import type { MuseumObject } from "@/types";
import type { BrowseFilters } from "./constants";
import { createStaticClient } from "@/lib/supabase/static";

export const MOMA_PAGE_SIZE = 5;

// Objects hidden from browse (disturbing content)
const BLOCKED_IDS = [
  "moma-172939", // Verweste Leiche — Die Morduntersuchung (Spoerri)
  "moma-175253", // Pulverschmauch — Die Morduntersuchung
  "moma-175254", // Schussrichtungsstab — Die Morduntersuchung
  "moma-175255", // Beilverletzungen — Die Morduntersuchung
  "moma-175256", // Selbsterhangen — Die Morduntersuchung
];

// Each day, start paging from a different offset in the 84k collection.
// Pages advance sequentially from there, wrapping around if needed.
const MOMA_APPROX_TOTAL = 85000;

function dailyMomaStart(): number {
  const d = new Date();
  const str = `moma-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let hash = 0;
  for (const c of str) hash = (Math.imul(31, hash) + c.charCodeAt(0)) | 0;
  return Math.abs(hash) % MOMA_APPROX_TOTAL;
}

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: "moma",
    title: (row.title as string) || "Untitled",
    date: (row.date as string) || "",
    culture: (row.culture as string) || "",
    medium: (row.medium as string) || "",
    imageUrl: (row.image_url as string | null) || null,
    thumbnailUrl: (row.thumbnail_url as string | null) || null,
    imageWidth: (row.image_width as number) || 4,
    imageHeight: (row.image_height as number) || 3,
    department: (row.department as string) || "",
    artistName: (row.artist_name as string) || "",
    creditLine: (row.credit_line as string) || "",
    dimensions: (row.dimensions as string) || "",
    objectUrl: (row.object_url as string | null) || null,
  };
}

export async function fetchMomaPage(
  filters: BrowseFilters,
  page: number
): Promise<{ objects: MuseumObject[]; total: number }> {
  if (filters.publicDomain) return { objects: [], total: 0 };
  try {
    const supabase = createStaticClient();

    if (filters.q) {
      const from = page * MOMA_PAGE_SIZE;
      const to = from + MOMA_PAGE_SIZE - 1;
      let query = supabase
        .from("objects_cache")
        .select("*", { count: "exact" })
        .eq("institution", "moma")
        .not("thumbnail_url", "is", null)
        .not("id", "in", `(${BLOCKED_IDS.join(",")})`);

      query = query.or(`title.ilike.%${filters.q}%,artist_name.ilike.%${filters.q}%,medium.ilike.%${filters.q}%`);
      if (filters.dateBegin) query = query.gte("year_begin", Number(filters.dateBegin));
      if (filters.dateEnd)   query = query.lte("year_end",   Number(filters.dateEnd));

      const { data, count, error } = await query.range(from, to);
      if (error) return { objects: [], total: 0 };
      return { objects: (data ?? []).map(rowToObject), total: count ?? 0 };
    }

    // Free browse: start at a daily random offset, wrap around the full collection
    const start = dailyMomaStart();
    const from = (start + page * MOMA_PAGE_SIZE) % MOMA_APPROX_TOTAL;
    const to = from + MOMA_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("objects_cache")
      .select("*")
      .eq("institution", "moma")
      .not("thumbnail_url", "is", null)
      .not("id", "in", `(${BLOCKED_IDS.join(",")})`)
      .range(from, to);

    if (error) return { objects: [], total: 0 };
    return { objects: (data ?? []).map(rowToObject), total: MOMA_APPROX_TOTAL };
  } catch {
    return { objects: [], total: 0 };
  }
}
