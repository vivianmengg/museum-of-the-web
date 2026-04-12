import type { MuseumObject } from "@/types";
import type { BrowseFilters } from "./constants";
import { createStaticClient } from "@/lib/supabase/static";

const AIC_BASE = "https://api.artic.edu/api/v1";
const AIC_FIELDS = "id,title,date_display,place_of_origin,medium_display,department_title,artist_display,credit_line,dimensions,image_id";
export const AIC_PAGE_SIZE = 10;

// Fetch image dimensions from AIC's IIIF info endpoint — much faster than probing the image bytes
async function fetchIiifDimensions(imageId: string): Promise<{ width: number; height: number }> {
  try {
    const res = await fetch(
      `https://www.artic.edu/iiif/2/${imageId}/info.json`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(2000) }
    );
    if (!res.ok) return { width: 4, height: 3 };
    const data = await res.json();
    return { width: data.width || 4, height: data.height || 3 };
  } catch {
    return { width: 4, height: 3 };
  }
}

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: "aic",
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

export async function fetchAicObject(artworkId: number): Promise<MuseumObject | null> {
  try {
    const res = await fetch(
      `${AIC_BASE}/artworks/${artworkId}?fields=${AIC_FIELDS}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data.data;
    if (!hit?.image_id) return null;

    const imageId = hit.image_id as string;
    const { width, height } = await fetchIiifDimensions(imageId);
    const artistName = ((hit.artist_display as string) || "").split("\n")[0].trim();

    return {
      id: `aic-${artworkId}`,
      institution: "aic",
      title: hit.title || "Untitled",
      date: hit.date_display || "",
      culture: hit.place_of_origin || "",
      medium: hit.medium_display || "",
      imageUrl: `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`,
      thumbnailUrl: `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`,
      imageWidth: width,
      imageHeight: height,
      department: hit.department_title || "",
      artistName,
      creditLine: hit.credit_line || "",
      dimensions: hit.dimensions || "",
      objectUrl: `https://www.artic.edu/artworks/${artworkId}`,
    };
  } catch {
    return null;
  }
}

export async function fetchAicPage(
  filters: BrowseFilters,
  page: number
): Promise<{ objects: MuseumObject[]; total: number }> {
  const offset = page * AIC_PAGE_SIZE;

  const mustClauses: unknown[] = [
    { term: { is_public_domain: true } },
    { exists: { field: "image_id" } },
  ];

  if (filters.q) {
    mustClauses.push({
      multi_match: {
        query: filters.q,
        fields: ["title", "artist_display", "medium_display", "place_of_origin", "term_titles"],
      },
    });
  }

  if (filters.dateBegin || filters.dateEnd) {
    mustClauses.push({
      bool: {
        should: [
          ...(filters.dateBegin ? [{ range: { date_start: { gte: parseInt(filters.dateBegin) } } }] : []),
          ...(filters.dateEnd ? [{ range: { date_end: { lte: parseInt(filters.dateEnd) } } }] : []),
        ],
        minimum_should_match: 1,
      },
    });
  }

  // Daily seed — rotates results each day, stable within a day
  const d = new Date();
  const dailySeed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

  // Wrap in function_score for random ordering on free browse; keep relevance sort for search
  const esQuery = filters.q
    ? { bool: { must: mustClauses } }
    : {
        function_score: {
          query: { bool: { must: mustClauses } },
          functions: [{ random_score: { seed: dailySeed + page, field: "id" } }],
          boost_mode: "replace",
        },
      };

  try {
    // ── 1. Search AIC ─────────────────────────────────────────────────────────
    const res = await fetch(`${AIC_BASE}/artworks/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "AIC-User-Agent": "museum-of-the-web/1.0" },
      body: JSON.stringify({
        query: esQuery,
        fields: AIC_FIELDS.split(","),
        limit: AIC_PAGE_SIZE,
        offset,
      }),
      next: { revalidate: 86400 },
    });

    if (!res.ok) return { objects: [], total: 0 };
    const data = await res.json();
    const hits: Record<string, unknown>[] = (data.data ?? []).filter(
      (h: Record<string, unknown>) => h.image_id
    );
    const total: number = data.pagination?.total ?? 0;

    // ── 2. Batch cache check — one query for all IDs ──────────────────────────
    const cacheIds = hits.map((h) => `aic-${h.id}`);
    let cachedMap = new Map<string, Record<string, unknown>>();
    try {
      const supabase = createStaticClient();
      const { data: rows } = await supabase
        .from("objects_cache")
        .select("*")
        .in("id", cacheIds);
      cachedMap = new Map((rows ?? []).map((r) => [r.id as string, r]));
    } catch { /* cache unavailable */ }

    // ── 3. Build objects (cache hit = instant, miss = info.json fetch) ────────
    const objects = (
      await Promise.all(
        hits.map(async (hit): Promise<MuseumObject | null> => {
          const cacheId = `aic-${hit.id}`;
          const cached = cachedMap.get(cacheId);
          if (cached) return rowToObject(cached);

          const imageId = hit.image_id as string;
          const { width, height } = await fetchIiifDimensions(imageId);
          const artistName = ((hit.artist_display as string) || "").split("\n")[0].trim();

          const object: MuseumObject = {
            id: cacheId,
            institution: "aic",
            title: (hit.title as string) || "Untitled",
            date: (hit.date_display as string) || "",
            culture: (hit.place_of_origin as string) || "",
            medium: (hit.medium_display as string) || "",
            imageUrl: `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`,
            thumbnailUrl: `https://www.artic.edu/iiif/2/${imageId}/full/400,/0/default.jpg`,
            imageWidth: width,
            imageHeight: height,
            department: (hit.department_title as string) || "",
            artistName,
            creditLine: (hit.credit_line as string) || "",
            dimensions: (hit.dimensions as string) || "",
            objectUrl: `https://www.artic.edu/artworks/${hit.id}`,
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
      )
    ).filter((o): o is MuseumObject => o !== null);

    return { objects, total };
  } catch {
    return { objects: [], total: 0 };
  }
}
