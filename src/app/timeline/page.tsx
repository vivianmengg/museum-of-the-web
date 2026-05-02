import { fetchMetObject } from "@/lib/met";
import { createStaticClient } from "@/lib/supabase/static";
import { unstable_cache } from "next/cache";
import TimelineView from "./TimelineView";
import type { MuseumObject } from "@/types";

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
  group?: string;
}

export const CIVILIZATIONS: Civilization[] = [
  // East Asia
  { id: "china",        label: "China",          color: "#4A7C59", dept: 6,  deptMatch: ["Asian", "Chinese Art", "Arts of Asia"], cultureMatch: ["Chinese", "China"],                                                                                                                                                                                                                                                                                           group: "East Asia" },
  { id: "japan",        label: "Japan",          color: "#6B4E8A", dept: 6,  deptMatch: ["Asian", "Japanese Art", "Arts of Asia"], cultureMatch: ["Japanese", "Japan"],                                                                                                                                                                                                                                                                                          group: "East Asia" },
  { id: "korea",        label: "Korea",          color: "#9E5252", dept: 6,  deptMatch: ["Asian", "Korean Art", "Arts of Asia"], cultureMatch: ["Korean", "Korea"],                                                                                                                                                                                                                                                                                            group: "East Asia" },
  // Southeast Asia
  { id: "thailand",     label: "Thailand",         color: "#8B7B30", dept: 6, deptMatch: ["Asian", "Arts of Asia"], cultureMatch: ["Thai", "Thailand", "Siamese"],                              group: "Southeast Asia" },
  { id: "cambodia",     label: "Cambodia",         color: "#7A6B20", dept: 6, deptMatch: ["Asian", "Arts of Asia"], cultureMatch: ["Cambodian", "Cambodia", "Khmer"],                           group: "Southeast Asia" },
  { id: "indonesia",    label: "Indonesia",        color: "#9B8B40", dept: 6, deptMatch: ["Asian", "Arts of Asia"], cultureMatch: ["Indonesian", "Indonesia", "Javanese"],                      group: "Southeast Asia" },
  { id: "vietnam",      label: "Vietnam",          color: "#6B8B30", dept: 6, deptMatch: ["Asian", "Arts of Asia"], cultureMatch: ["Vietnamese", "Vietnam", "Champa"],                          group: "Southeast Asia" },
  { id: "myanmar",      label: "Myanmar",          color: "#7B6B50", dept: 6, deptMatch: ["Asian", "Arts of Asia"], cultureMatch: ["Burmese", "Myanmar", "Burma"],                              group: "Southeast Asia" },
  // South & West Asia
  { id: "india",        label: "India",          color: "#B5621E", dept: 6,  deptMatch: ["Asian", "Arts of Asia", "Indian Art"], cultureMatch: ["Indian", "India", "South Asian"],                                                                                                                                                                                                                                                                                                                                 group: "South & West Asia" },
  { id: "near-east",   label: "Ancient Near East", color: "#8B4513", dept: 3, deptMatch: ["Near Eastern", "West Asian"],                                                                                                                                                                                                                                                                                                                       group: "South & West Asia" },
  { id: "islamic",     label: "Islamic World",   color: "#1E6B7A", dept: 14, deptMatch: ["Islamic"],                                                                                                                                                                                                                                                                                                                             group: "South & West Asia" },
  // Mediterranean & Europe
  { id: "greece-rome", label: "Eastern Mediterranean", color: "#6B4226", dept: 13, deptMatch: ["Greek", "Roman", "Getty Villa", "Greece, Rome", "Greece,"],                                                                                                                                                                                                                                                                                                 group: "Mediterranean & Europe" },
  { id: "europe",      label: "Europe",          color: "#4A5E7A", dept: 11, deptMatch: ["European", "Medieval", "Getty Center", "Europe"], query: "painting",                                                                                                                                                                                                                                                                             group: "Mediterranean & Europe" },
  // Africa
  { id: "egypt",       label: "Ancient Egypt",   color: "#B8960C", dept: 10, deptMatch: ["Egyptian", "Arts of Africa"], cultureMatch: ["Egypt", "Egyptian"],                                                                                                                                                                                                                                                                                                                            group: "Africa" },
  { id: "africa",      label: "Africa",          color: "#7A3E2A", dept: 5,  deptMatch: ["Africa"], cultureMatch: ["Yoruba", "Fon", "Benin", "Ife", "Igbo", "Akan", "Asante", "Ashanti", "Bamana", "Dogon", "Fang", "Kongo", "Luba", "Kuba", "Pende", "Chokwe", "Senufo", "Baule", "Mangbetu", "Zande", "Swahili", "Amhara", "Edo", "Tellem", "Tabwa", "Hemba", "Songye", "Lega", "Middle Niger", "Lower Niger", "Ethiopia", "Nigeria", "Ghana", "Mali", "Kenya", "Gabon", "Angola", "Congo"],                       group: "Africa" },
  // Americas & Oceania
  { id: "americas",    label: "The Americas",    color: "#8B3A2A", dept: 5,  deptMatch: ["Africa, Oceania", "Americas"], cultureMatch: ["Maya", "Mayan", "Aztec", "Inca", "Olmec", "Mixtec", "Zapotec", "Moche", "Chimú", "Chimu", "Tiwanaku", "Wari", "Nazca", "Teotihuacan", "Mississippian", "Hohokam", "Pueblo", "Native American", "Mexican", "Peruvian", "Colombian", "Costa Rican", "Panamanian"],                                  group: "Americas & Oceania" },
  { id: "oceania",     label: "Oceania",         color: "#2E7B6B", dept: 5,  deptMatch: ["Africa, Oceania"], cultureMatch: ["Hawaiian", "Maori", "Fijian", "Tongan", "Samoan", "Papua", "Melanesian", "Polynesian", "Micronesian", "Oceanian", "Papuan"],                                                                                                                                                                        group: "Americas & Oceania" },
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

  const matchedDept = civ.deptMatch.find((d) => dept.includes(d.toLowerCase()));

  // No dept match: fall back to culture-only for medium-based depts (e.g. "Textiles", "Prints")
  // Only fires when the culture is explicit — never matches blank culture.
  if (!matchedDept) {
    if (!culture || !civ.cultureMatch) return false;
    return civ.cultureMatch.some((c) => culture.includes(c.toLowerCase()));
  }

  if (!civ.cultureMatch) return true;

  // Blank culture: pass for specific depts, fail for ambiguous ones where
  // cultureMatch is the only way to distinguish (e.g. "Arts of Africa" = Egypt vs Africa)
  if (!culture) {
    const AMBIGUOUS_DEPTS = ["arts of africa", "arts of asia", "africa, oceania", "americas"];
    const isAmbiguous = AMBIGUOUS_DEPTS.some((a) => dept.includes(a));
    return !isAmbiguous;
  }

  return civ.cultureMatch.some((c) => culture.includes(c.toLowerCase()));
}

export { parseDateToYear } from "@/lib/parseDate";
import { parseDateToYear } from "@/lib/parseDate";

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

const TIMELINE_COLS = "id,institution,title,date,culture,medium,image_url,thumbnail_url,image_width,image_height,department,artist_name,credit_line,dimensions,object_url,year_begin,year_end";

const fetchTimelineRows = unstable_cache(
  async () => {
    const supabase = createStaticClient();
    const [
      { data: seededRows },
      { data: harvardNeolithicRows },
      { data: browseRows },
    ] = await Promise.all([
      supabase
        .from("objects_cache")
        .select(TIMELINE_COLS)
        .not("thumbnail_url", "is", null)
        .not("year_begin", "is", null)
        .neq("institution", "harvard")
        .neq("institution", "colbase")
        .gte("year_begin", -7000)
        .lte("year_begin",  2026)
        .order("year_begin")
        .limit(40000),
      supabase
        .from("objects_cache")
        .select(TIMELINE_COLS)
        .not("thumbnail_url", "is", null)
        .not("year_begin", "is", null)
        .eq("institution", "harvard")
        .gte("year_begin", -7000)
        .lte("year_begin", -1500)
        .order("year_begin")
        .limit(500),
      supabase
        .from("objects_cache")
        .select(TIMELINE_COLS)
        .not("thumbnail_url", "is", null)
        .neq("institution", "harvard")
        .neq("institution", "colbase")
        .is("year_begin", null)
        .neq("date", "")
        .limit(5000),
    ]);
    return [...(seededRows ?? []), ...(browseRows ?? []), ...(harvardNeolithicRows ?? [])];
  },
  ["timeline-rows"],
  { revalidate: false, tags: ["timeline-rows"] }
);

export default async function TimelinePage() {
  const rows = await fetchTimelineRows() as Record<string, unknown>[];

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

  // Met API fallback disabled — too slow for serverless (causes timeouts on Vercel).
  // Civilizations with few cached objects will show what's in the DB.

  return <TimelineView objects={timelineObjects} civilizations={CIVILIZATIONS} />;
}
