import { fetchMetObject } from "@/lib/met";
import { createStaticClient } from "@/lib/supabase/static";
import TimelineView from "./TimelineView";
import type { MuseumObject } from "@/types";

export const revalidate = 3600;

const MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

export interface Civilization {
  id: string;
  label: string;
  color: string;
  dept: number;
  geo?: string;
  query?: string;
  deptMatch: string[];
  cultureMatch?: string[];
}

export const CIVILIZATIONS: Civilization[] = [
  { id: "egypt",       label: "Nile Valley",           color: "#B8960C", dept: 10, deptMatch: ["Egyptian"] },
  { id: "near-east",   label: "Ancient Near East",     color: "#8B4513", dept: 3,  deptMatch: ["Near Eastern"] },
  { id: "greece-rome", label: "Eastern Mediterranean", color: "#6B4226", dept: 13, deptMatch: ["Greek", "Roman", "Getty Villa"] },
  { id: "china",       label: "East Asia — China",     color: "#4A7C59", dept: 6,  deptMatch: ["Asian"], cultureMatch: ["Chinese", "China"] },
  { id: "india",       label: "South Asia",            color: "#B5621E", dept: 6,  deptMatch: ["Asian"], cultureMatch: ["Indian", "India", "South Asian"] },
  { id: "japan",       label: "East Asia — Japan",     color: "#6B4E8A", dept: 6,  deptMatch: ["Asian"], cultureMatch: ["Japanese", "Japan"] },
  { id: "korea",          label: "East Asia — Korea",  color: "#9E5252", dept: 6,  deptMatch: ["Asian"],            cultureMatch: ["Korean", "Korea"] },
  { id: "southeast-asia", label: "Southeast Asia",      color: "#8B7B30", dept: 6,  deptMatch: ["Asian"],            cultureMatch: ["Thai", "Thailand", "Cambodian", "Cambodia", "Khmer", "Vietnamese", "Vietnam", "Burmese", "Myanmar", "Indonesian", "Indonesia", "Southeast Asian", "Javanese", "Mon", "Cham", "Siamese"] },
  { id: "islamic",        label: "Islamic World",       color: "#1E6B7A", dept: 14, deptMatch: ["Islamic"] },
  { id: "europe",         label: "Europe",              color: "#4A5E7A", dept: 11, deptMatch: ["European", "Medieval", "Getty Center"], query: "painting" },
  { id: "africa",         label: "Africa",              color: "#7A3E2A", dept: 5,  deptMatch: ["Africa, Oceania"],  cultureMatch: ["Yoruba", "Fon", "Benin", "Ife", "Igbo", "Akan", "Asante", "Ashanti", "Bamana", "Dogon", "Fang", "Kongo", "Luba", "Kuba", "Pende", "Chokwe", "Senufo", "Baule", "Dan", "Mangbetu", "Zande", "Swahili", "Amhara", "Ethiopian", "African", "Malian", "Ghanaian", "Nigerian"] },
  { id: "oceania",        label: "Oceania",             color: "#2E7B6B", dept: 5,  deptMatch: ["Africa, Oceania"],  cultureMatch: ["Hawaiian", "Maori", "Fijian", "Tongan", "Samoan", "Papua", "Melanesian", "Polynesian", "Micronesian", "Oceanian", "Papuan"] },
  { id: "americas",       label: "The Americas",        color: "#8B3A2A", dept: 5,  deptMatch: ["Africa, Oceania"],  cultureMatch: ["Maya", "Mayan", "Aztec", "Inca", "Olmec", "Mixtec", "Zapotec", "Moche", "Chimú", "Chimu", "Tiwanaku", "Wari", "Nazca", "Teotihuacan", "Mississippian", "Hohokam", "Pueblo", "Native American", "Mexican", "Peruvian", "Colombian", "Costa Rican", "Panamanian"] },
];

export type TimelineObject = MuseumObject & { civId: string; year: number };

const CACHE_SUFFICIENT = 20;

const TIME_BUCKETS = [
  { from: -7000, to: -3000 },
  { from: -3000, to: -1500 },
  { from: -1500, to:  -300 },
  { from:  -300, to:   500 },
  { from:   500, to:  1200 },
  { from:  1200, to:  1900 },
  { from:  1900, to:  2026 },
];
const PER_BUCKET = 8;

function rowToMuseumObject(row: Record<string, unknown>): MuseumObject {
  return {
    id:           row.id as string,
    institution:  row.institution as "met" | "aic" | "rijks" | "moma",
    title:        (row.title as string) || "Untitled",
    date:         (row.date as string) || "",
    culture:      (row.culture as string) || "",
    medium:       (row.medium as string) || "",
    imageUrl:     (row.image_url as string | null) || null,
    thumbnailUrl: (row.thumbnail_url as string | null) || null,
    imageWidth:   (row.image_width as number) || 4,
    imageHeight:  (row.image_height as number) || 3,
    department:   (row.department as string) || "",
    artistName:   (row.artist_name as string) || "",
    creditLine:   (row.credit_line as string) || "",
    dimensions:   (row.dimensions as string) || "",
    objectUrl:    (row.object_url as string | null) || null,
  };
}

export function matchesCiv(row: Record<string, unknown>, civ: Civilization): boolean {
  const dept    = ((row.department as string) || "").toLowerCase();
  const culture = ((row.culture    as string) || "").toLowerCase();

  const deptOk = civ.deptMatch.some((d) => dept.includes(d.toLowerCase()));
  if (!deptOk) return false;

  if (civ.cultureMatch) {
    return civ.cultureMatch.some((c) => culture.includes(c.toLowerCase()));
  }
  return true;
}

export function parseDateToYear(date: string): number | null {
  if (!date) return null;
  const s = date.toLowerCase()
    .replace(/\bca\.?\b|\bcirca\b|\bc\.\b/g, "")
    .replace(/b\.c\.e?\./g, "bce")
    .replace(/a\.d\./g, "ce")
    .trim();

  const bceRange = s.match(/(\d+)\s*[–\-]\s*(\d+)\s*bc[e]?/);
  if (bceRange) return -(parseInt(bceRange[1]) + parseInt(bceRange[2])) / 2;

  const bceToCe = s.match(/(\d+)\s*bc[e]?\s*[–\-]\s*(\d+)\s*c[e]?/);
  if (bceToCe) return (-parseInt(bceToCe[1]) + parseInt(bceToCe[2])) / 2;

  const bce = s.match(/(\d+)\s*bc[e]?/);
  if (bce) return -parseInt(bce[1]);

  const ceRange = s.match(/(\d{1,4})\s*[–\-]\s*(\d{1,4})/);
  if (ceRange) {
    const a = parseInt(ceRange[1]), b = parseInt(ceRange[2]);
    if (b > a && b <= 2100) return (a + b) / 2;
  }

  const century = s.match(/(\d+)(?:st|nd|rd|th)\s*century/);
  if (century) return (parseInt(century[1]) - 1) * 100 + 50;

  const year = s.match(/\b(\d{3,4})\b/);
  if (year) return parseInt(year[1]);

  return null;
}

async function fetchBucketIds(civ: Civilization, from: number, to: number): Promise<number[]> {
  const url = new URL(`${MET_BASE}/search`);
  url.searchParams.set("hasImages", "true");
  url.searchParams.set("isPublicDomain", "true");
  url.searchParams.set("q", civ.query ?? "the");
  url.searchParams.set("departmentId", String(civ.dept));
  url.searchParams.set("dateBegin", String(from));
  url.searchParams.set("dateEnd", String(to));
  if (civ.geo) url.searchParams.set("geoLocation", civ.geo);
  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.objectIDs as number[]) ?? [];
  } catch {
    return [];
  }
}

function sampleSpread(arr: number[], count: number): number[] {
  if (arr.length <= count) return arr;
  const step = arr.length / count;
  return Array.from({ length: count }, (_, i) => arr[Math.floor(i * step)]);
}

export default async function TimelinePage() {
  const supabase = createStaticClient();

  // Main objects: exclude harvard except Neolithic Chinese (year_begin <= -1500)
  const { data: seededRows } = await supabase
    .from("objects_cache")
    .select("*")
    .not("thumbnail_url", "is", null)
    .not("year_begin", "is", null)
    .neq("institution", "harvard")
    .gte("year_begin", -7000)
    .lte("year_begin",  2026)
    .order("year_begin")
    .limit(15000);

  const { data: harvardNeolithicRows } = await supabase
    .from("objects_cache")
    .select("*")
    .not("thumbnail_url", "is", null)
    .not("year_begin", "is", null)
    .eq("institution", "harvard")
    .gte("year_begin", -7000)
    .lte("year_begin", -1500)
    .order("year_begin")
    .limit(500);

  const { data: browseRows } = await supabase
    .from("objects_cache")
    .select("*")
    .not("thumbnail_url", "is", null)
    .neq("institution", "harvard")
    .is("year_begin", null)
    .neq("date", "")
    .limit(2000);

  const rows = [...(seededRows ?? []), ...(browseRows ?? []), ...(harvardNeolithicRows ?? [])] as Record<string, unknown>[];

  const civCounts = new Map<string, number>(CIVILIZATIONS.map((c) => [c.id, 0]));
  const timelineObjects: TimelineObject[] = [];

  for (const row of rows) {
    for (const civ of CIVILIZATIONS) {
      if (!matchesCiv(row, civ)) continue;
      const obj = rowToMuseumObject(row);
      const yb = row.year_begin as number | null;
      const ye = row.year_end   as number | null;
      let year: number | null;
      if (yb !== null) {
        const span = (ye ?? yb) - yb;
        // Ancient objects (pre-3000 BCE): use year_begin so they appear at the
        // early end of the timeline. Later objects: use year_end for wide spans
        // (avoids BCE-CE crossers landing in wrong era), midpoint for narrow.
        if (yb < -3000) {
          year = yb;
        } else {
          year = span > 400 ? (ye ?? yb) : Math.round((yb + (ye ?? yb)) / 2);
        }
      } else {
        year = parseDateToYear(obj.date);
      }
      if (year !== null && year >= -7000 && year <= 2026) {
        timelineObjects.push({ ...obj, civId: civ.id, year });
        civCounts.set(civ.id, (civCounts.get(civ.id) ?? 0) + 1);
      }
      break;
    }
  }

  const sparseCivs = CIVILIZATIONS.filter((c) => (civCounts.get(c.id) ?? 0) < CACHE_SUFFICIENT);

  if (sparseCivs.length > 0) {
    const existingIds = new Set(timelineObjects.map((o) => o.id));

    const bucketResults = await Promise.all(
      sparseCivs.flatMap((civ) =>
        TIME_BUCKETS.map(async ({ from, to }) => {
          const ids = await fetchBucketIds(civ, from, to);
          return { civ, ids: sampleSpread(ids, PER_BUCKET) };
        })
      )
    );

    const toFetch: Array<{ civ: Civilization; id: number }> = [];
    const seenIds = new Set<number>();
    for (const { civ, ids } of bucketResults) {
      for (const id of ids) {
        const cacheKey = `met-${id}`;
        if (!seenIds.has(id) && !existingIds.has(cacheKey)) {
          seenIds.add(id);
          toFetch.push({ civ, id });
        }
      }
    }

    const fetched = await Promise.all(
      toFetch.map(async ({ civ, id }) => {
        const obj = await fetchMetObject(id);
        return obj ? { civ, obj } : null;
      })
    );

    for (const result of fetched) {
      if (!result) continue;
      const { obj } = result;
      const year = parseDateToYear(obj.date);
      if (year === null || year < -7000 || year > 1900) continue;

      const fakeRow = { department: obj.department, culture: obj.culture };
      let civId = result.civ.id;
      for (const civ of CIVILIZATIONS) {
        if (matchesCiv(fakeRow as Record<string, unknown>, civ)) { civId = civ.id; break; }
      }

      timelineObjects.push({ ...obj, civId, year });
    }
  }

  return <TimelineView objects={timelineObjects} civilizations={CIVILIZATIONS} />;
}
