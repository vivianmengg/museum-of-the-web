import probe from "probe-image-size";
import type { MuseumObject } from "@/types";
import { PAGE_SIZE } from "./constants";
import type { BrowseFilters } from "./constants";
import { createClient } from "@/lib/supabase/server";

export type { BrowseFilters };
export { PAGE_SIZE };

const MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

// For free browse: fetch from diverse departments in parallel so no single
// region dominates. "the" matches almost every English-described object and
// departmentId ensures we're scoped to the right collection area.
const DIVERSE_DEPARTMENTS: { id: number; q: string }[] = [
  { id: 14, q: "the" },  // Islamic Art
  { id: 6,  q: "the" },  // Asian Art
  { id: 13, q: "the" },  // Greek and Roman Art
  { id: 10, q: "the" },  // Egyptian Art
  { id: 5,  q: "the" },  // Arts of Africa, Oceania, and the Americas
  { id: 17, q: "the" },  // Medieval Art
  { id: 3,  q: "the" },  // Ancient Near Eastern Art
  { id: 11, q: "painting" }, // European Paintings (intentionally narrowed)
  { id: 19, q: "the" },  // Photographs
  { id: 9,  q: "the" },  // Drawings and Prints
];

async function fetchDepartmentIds(deptId: number, q: string): Promise<number[]> {
  const url = new URL(`${MET_BASE}/search`);
  url.searchParams.set("hasImages", "true");
  url.searchParams.set("isPublicDomain", "true");
  url.searchParams.set("departmentId", String(deptId));
  url.searchParams.set("q", q);
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.objectIDs ?? [];
  } catch {
    return [];
  }
}

// Fetch all matching IDs for a set of filters (cached 1h)
export async function fetchMetIds(filters: BrowseFilters): Promise<number[]> {
  // User search: respect Met's relevance ranking
  if (filters.q?.trim()) {
    const url = new URL(`${MET_BASE}/search`);
    url.searchParams.set("hasImages", "true");
    url.searchParams.set("isPublicDomain", "true");
    url.searchParams.set("q", filters.q.trim());
    if (filters.culture) url.searchParams.set("culture", filters.culture);
    if (filters.medium) url.searchParams.set("medium", filters.medium);
    if (filters.dateBegin) url.searchParams.set("dateBegin", filters.dateBegin);
    if (filters.dateEnd) url.searchParams.set("dateEnd", filters.dateEnd);
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.objectIDs ?? [];
  }

  // Free browse: parallel per-department fetch for cultural diversity
  const perDept = await Promise.all(
    DIVERSE_DEPARTMENTS.map(({ id, q }) => fetchDepartmentIds(id, q))
  );

  // Round-robin interleave so every department contributes equally to the pool
  const combined: number[] = [];
  const maxLen = Math.max(...perDept.map((ids) => ids.length));
  for (let i = 0; i < maxLen; i++) {
    for (const ids of perDept) {
      if (i < ids.length) combined.push(ids[i]);
    }
  }
  return [...new Set(combined)];
}

const PROBE_TIMEOUT_MS = 3000;

async function probeImageSize(url: string): Promise<{ width: number; height: number }> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("probe timeout")), PROBE_TIMEOUT_MS)
    );
    const result = await Promise.race([probe(url), timeout]);
    return { width: result.width, height: result.height };
  } catch {
    return { width: 4, height: 3 };
  }
}

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: row.institution as "met" | "aic",
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

export async function fetchMetObject(objectId: number): Promise<MuseumObject | null> {
  const cacheId = `met-${objectId}`;

  // ── 1. Check Supabase cache ───────────────────────────────────────────────
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("objects_cache")
      .select("*")
      .eq("id", cacheId)
      .maybeSingle();

    if (data) return rowToObject(data);
  } catch {
    // Cache unavailable — fall through to live fetch
  }

  // ── 2. Fetch from Met API ─────────────────────────────────────────────────
  const res = await fetch(`${MET_BASE}/objects/${objectId}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d: any = await res.json();

  const thumbnailUrl: string | null = d.primaryImageSmall || d.primaryImage || null;
  if (!thumbnailUrl) return null;

  const { width, height } = await probeImageSize(thumbnailUrl);

  const object: MuseumObject = {
    id: cacheId,
    institution: "met",
    title: d.title || "Untitled",
    date: d.objectDate || "",
    culture: d.culture || "",
    medium: d.medium || "",
    imageUrl: d.primaryImage || null,
    thumbnailUrl,
    imageWidth: width,
    imageHeight: height,
    department: d.department || "",
    artistName: d.artistDisplayName || "",
    creditLine: d.creditLine || "",
    dimensions: d.dimensions || "",
    objectUrl: d.objectURL || null,
  };

  // ── 3. Store in cache (best-effort, non-blocking) ─────────────────────────
  createClient().then((supabase) =>
    supabase.from("objects_cache").upsert(
      {
        id: object.id,
        institution: object.institution,
        title: object.title,
        date: object.date,
        culture: object.culture,
        medium: object.medium,
        image_url: object.imageUrl,
        thumbnail_url: object.thumbnailUrl,
        image_width: object.imageWidth,
        image_height: object.imageHeight,
        department: object.department,
        artist_name: object.artistName,
        credit_line: object.creditLine,
        dimensions: object.dimensions,
        object_url: object.objectUrl,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
  ).catch(() => {/* non-critical */});

  return object;
}

// Seeded shuffle — same order for everyone on a given day, changes at midnight
function dailySeed(): number {
  const d = new Date();
  const str = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  let hash = 0;
  for (const c of str) hash = (Math.imul(31, hash) + c.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildDailyPool(allIds: number[]): number[] {
  const seed = dailySeed();
  // Deduplicate, then shuffle the full set — no arbitrary cap
  const unique = [...new Set(allIds)];
  return seededShuffle(unique, seed);
}

// Fetch one page of Met objects (filters + page index)
export async function fetchMetPage(
  filters: BrowseFilters,
  page: number
): Promise<{ objects: MuseumObject[]; total: number }> {
  const allIds = await fetchMetIds(filters);
  const pool = filters.q ? allIds : buildDailyPool(allIds);
  // Wrap so Met always contributes — cycles through the daily pool on deep scrolls
  const poolPages = Math.max(1, Math.ceil(pool.length / PAGE_SIZE));
  const wrappedPage = page % poolPages;
  const slice = pool.slice(wrappedPage * PAGE_SIZE, (wrappedPage + 1) * PAGE_SIZE);

  // ── Batch cache check — one query for all IDs ─────────────────────────────
  const cacheIds = slice.map((id) => `met-${id}`);
  let cachedMap = new Map<string, Record<string, unknown>>();
  try {
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("objects_cache")
      .select("*")
      .in("id", cacheIds);
    cachedMap = new Map((rows ?? []).map((r) => [r.id as string, r]));
  } catch { /* cache unavailable */ }

  const results = await Promise.all(
    slice.map((id) => {
      const cached = cachedMap.get(`met-${id}`);
      if (cached) return Promise.resolve(rowToObject(cached));
      return fetchMetObject(id); // falls back to Met API + probe for uncached
    })
  );
  const objects = results.filter((o): o is MuseumObject => o !== null);

  return { objects, total: allIds.length };
}
