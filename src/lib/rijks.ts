import type { MuseumObject } from "@/types";
import type { BrowseFilters } from "./constants";
import { createStaticClient } from "@/lib/supabase/static";

const RIJKS_BASE = "https://www.rijksmuseum.nl/api/en/collection";
export const RIJKS_PAGE_SIZE = 10;

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: "rijks",
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

export async function fetchRijksObject(objectNumber: string): Promise<MuseumObject | null> {
  const params = new URLSearchParams();
  const apiKey = process.env.RIJKSMUSEUM_API_KEY;
  if (apiKey) params.set("key", apiKey);

  try {
    const res = await fetch(
      `${RIJKS_BASE}/${encodeURIComponent(objectNumber)}?${params}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const art = data.artObject;
    if (!art?.webImage?.url) return null;

    const webImage = art.webImage;
    const cacheId = `rijks-${objectNumber}`;
    const object: MuseumObject = {
      id: cacheId,
      institution: "rijks",
      title: art.title || "Untitled",
      date: art.dating?.presentingDate || "",
      culture: art.productionPlaces?.[0] || "",
      medium: art.physicalMedium || "",
      imageUrl: webImage.url,
      thumbnailUrl: webImage.url.replace(/=s\d+$/, "=s400") || webImage.url,
      imageWidth: webImage.width || 4,
      imageHeight: webImage.height || 3,
      department: art.classification?.iconClassDescription?.[0] || "",
      artistName: art.principalOrFirstMaker || "",
      creditLine: "",
      dimensions: "",
      objectUrl: `https://www.rijksmuseum.nl/en/collection/${objectNumber}`,
    };
    return object;
  } catch {
    return null;
  }
}

export async function fetchRijksPage(
  filters: BrowseFilters,
  page: number
): Promise<{ objects: MuseumObject[]; total: number }> {
  const params = new URLSearchParams({
    imgonly: "True",
    ps: String(RIJKS_PAGE_SIZE),
    p: String(page + 1),
  });

  const apiKey = process.env.RIJKSMUSEUM_API_KEY;
  if (apiKey) params.set("key", apiKey);
  if (filters.q) params.set("q", filters.q);

  try {
    // ── 1. Fetch from Rijks API ───────────────────────────────────────────────
    const res = await fetch(`${RIJKS_BASE}?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) return { objects: [], total: 0 };
    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const artObjects: any[] = (data.artObjects ?? []).filter((a: any) => a.webImage?.url);
    const total: number = data.count ?? 0;

    // ── 2. Batch cache check ──────────────────────────────────────────────────
    const cacheIds = artObjects.map((a) => `rijks-${a.objectNumber}`);
    let cachedMap = new Map<string, Record<string, unknown>>();
    try {
      const supabase = createStaticClient();
      const { data: rows } = await supabase
        .from("objects_cache")
        .select("*")
        .in("id", cacheIds);
      cachedMap = new Map((rows ?? []).map((r) => [r.id as string, r]));
    } catch { /* cache unavailable */ }

    // ── 3. Build objects ──────────────────────────────────────────────────────
    const objects = artObjects
      .map((art): MuseumObject | null => {
        const cacheId = `rijks-${art.objectNumber}`;
        const cached = cachedMap.get(cacheId);
        if (cached) return rowToObject(cached);

        const webImage = art.webImage;
        // Rijks provides dimensions in the API response — no probing needed
        const imageWidth = webImage.width || 4;
        const imageHeight = webImage.height || 3;
        const thumbnailUrl = webImage.url.replace(/=s\d+$/, "=s400") || webImage.url;

        const object: MuseumObject = {
          id: cacheId,
          institution: "rijks",
          title: art.title || "Untitled",
          date: art.dating?.presentingDate || "",
          culture: art.productionPlaces?.[0] || "",
          medium: art.physicalMedium || "",
          imageUrl: webImage.url,
          thumbnailUrl,
          imageWidth,
          imageHeight,
          department: art.classification?.iconClassDescription?.[0] || "",
          artistName: art.principalOrFirstMaker || "",
          creditLine: "",
          dimensions: "",
          objectUrl: `https://www.rijksmuseum.nl/en/collection/${art.objectNumber}`,
        };

        // Cache non-blocking
        Promise.resolve(createStaticClient()).then((supabase) =>
          supabase.from("objects_cache").upsert({
            id: object.id, institution: object.institution, title: object.title,
            date: object.date, culture: object.culture, medium: object.medium,
            image_url: object.imageUrl, thumbnail_url: object.thumbnailUrl,
            image_width: object.imageWidth, image_height: object.imageHeight,
            department: object.department, artist_name: object.artistName,
            credit_line: object.creditLine, dimensions: object.dimensions,
            object_url: object.objectUrl, cached_at: new Date().toISOString(),
          }, { onConflict: "id" })
        ).catch(() => {});

        return object;
      })
      .filter((o): o is MuseumObject => o !== null);

    return { objects, total };
  } catch {
    return { objects: [], total: 0 };
  }
}
