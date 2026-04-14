// Fetch page from any institution that lives entirely in Supabase cache.
// Used for: cleveland, harvard, smithsonian, colbase, getty, brooklyn (post-seed)
import type { MuseumObject } from "@/types";
import type { BrowseFilters } from "./constants";
import { createStaticClient } from "@/lib/supabase/static";

export const SEEDED_PAGE_SIZE = 5;

type SeededInstitution = "cleveland" | "harvard" | "smithsonian" | "colbase" | "getty" | "princeton";

const INSTITUTIONS: SeededInstitution[] = [
  "cleveland", "harvard", "smithsonian", "colbase", "getty", "princeton",
];

function dailyStart(institution: string, total: number): number {
  const d = new Date();
  const str = `${institution}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let hash = 0;
  for (const c of str) hash = (Math.imul(31, hash) + c.charCodeAt(0)) | 0;
  return Math.abs(hash) % Math.max(total, 1);
}

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: row.institution as MuseumObject["institution"],
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

export async function fetchSeededPage(
  filters: BrowseFilters,
  page: number
): Promise<{ objects: MuseumObject[]; total: number }> {
  try {
    const supabase = createStaticClient();

    if (filters.q) {
      const from = page * SEEDED_PAGE_SIZE;
      const to = from + SEEDED_PAGE_SIZE - 1;
      const { data, count, error } = await supabase
        .from("objects_cache")
        .select("*", { count: "exact" })
        .in("institution", INSTITUTIONS)
        .not("thumbnail_url", "is", null)
        .or(`title.ilike.%${filters.q}%,artist_name.ilike.%${filters.q}%,medium.ilike.%${filters.q}%`)
        .range(from, to);
      if (error) return { objects: [], total: 0 };
      return { objects: (data ?? []).map(rowToObject), total: count ?? 0 };
    }

    // Free browse: get total count once, then daily-offset page
    const { count } = await supabase
      .from("objects_cache")
      .select("*", { count: "exact", head: true })
      .in("institution", INSTITUTIONS)
      .not("thumbnail_url", "is", null);

    const total = count ?? 0;
    const start = dailyStart("seeded", total);
    const from = (start + page * SEEDED_PAGE_SIZE) % Math.max(total, 1);
    const to = from + SEEDED_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("objects_cache")
      .select("*")
      .in("institution", INSTITUTIONS)
      .not("thumbnail_url", "is", null)
      .range(from, to);

    if (error) return { objects: [], total: 0 };
    return { objects: (data ?? []).map(rowToObject), total };
  } catch {
    return { objects: [], total: 0 };
  }
}
