import type { MuseumObject } from "@/types";
import type { BrowseFilters } from "./constants";
import { createClient } from "@/lib/supabase/server";

export const MOMA_PAGE_SIZE = 5;

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
  try {
    const supabase = await createClient();

    // For search queries, paginate normally
    if (filters.q) {
      const from = page * MOMA_PAGE_SIZE;
      const to = from + MOMA_PAGE_SIZE - 1;
      const { data, count, error } = await supabase
        .from("objects_cache")
        .select("*", { count: "exact" })
        .eq("institution", "moma")
        .not("thumbnail_url", "is", null)
        .or(`title.ilike.%${filters.q}%,artist_name.ilike.%${filters.q}%,medium.ilike.%${filters.q}%`)
        .range(from, to);
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
      .range(from, to);

    if (error) return { objects: [], total: 0 };
    return { objects: (data ?? []).map(rowToObject), total: MOMA_APPROX_TOTAL };
  } catch {
    return { objects: [], total: 0 };
  }
}
