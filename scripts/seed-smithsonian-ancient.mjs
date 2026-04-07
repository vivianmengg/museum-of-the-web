// seed-smithsonian-ancient.mjs
// Seeds Smithsonian National Museum of Asian Art objects from pre-3000 BCE.
// Filters out library records, keeps only objects with images.
//
// Run: node scripts/seed-smithsonian-ancient.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SI_BASE = "https://api.si.edu/openaccess/api/v1.0";
const API_KEY = "EVekTdDao0rDvtY2X6RPOY7MmZhldD0TW0RjNLeN";
const REQUEST_DELAY = 300;

const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const KEYWORDS = [
  "neolithic china", "yangshao", "longshan", "majiayao", "dawenkou",
  "liangzhu", "hongshan", "banpo", "jomon", "prehistoric vessel",
  "predynastic", "chalcolithic", "uruk", "early dynastic mesopotamia",
];

const MUSEUM_SOURCES = new Set([
  "National Museum of Asian Art",
  "Freer Gallery of Art",
  "Arthur M. Sackler Gallery",
]);

async function searchSI(keyword, rows = 100) {
  const url = new URL(`${SI_BASE}/search`);
  url.searchParams.set("q", keyword);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("rows", String(rows));
  url.searchParams.set("online_media_type", "Images");
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.response?.rows ?? [];
}

function extractObject(r) {
  const dnr = r.content?.descriptiveNonRepeating;
  const freetext = r.content?.freetext;

  const dataSource = dnr?.data_source ?? "";
  if (!MUSEUM_SOURCES.has(dataSource)) return null;

  const media = dnr?.online_media?.media?.[0];
  const thumbnail = media?.thumbnail;
  if (!thumbnail) return null;

  const dateStr = freetext?.date?.[0]?.content ?? "";
  const objectType = freetext?.objectType?.[0]?.content ?? "";
  const culture = freetext?.culture?.[0]?.content ?? "";
  const medium = freetext?.physicalDescription?.[0]?.content ?? "";
  const creditLine = freetext?.creditLine?.[0]?.content ?? "";
  const dept = freetext?.setName?.[0]?.content ?? dnr?.unit_name ?? "";

  // Parse year from date string
  const year = parseYear(dateStr);
  if (year === null || year > -3000) return null;

  return {
    id: `smithsonian-${r.id ?? r.content?.descriptiveNonRepeating?.record_ID}`,
    institution: "met", // map to met for now so matchesCiv works
    title: r.title || "Untitled",
    date: dateStr,
    culture,
    medium,
    image_url: media?.content ?? thumbnail,
    thumbnail_url: thumbnail,
    department: dept,
    artist_name: freetext?.name?.[0]?.content ?? "",
    credit_line: creditLine,
    dimensions: freetext?.physicalDescription?.[1]?.content ?? "",
    object_url: dnr?.record_link ?? null,
    year_begin: year,
    year_end: year,
    cached_at: new Date().toISOString(),
  };
}

function parseYear(dateStr) {
  if (!dateStr) return null;
  const s = dateStr.toLowerCase();

  const bceRange = s.match(/(\d+)[–\-](\d+)\s*bce?/);
  if (bceRange) return -parseInt(bceRange[1]);

  const bce = s.match(/(\d+)\s*bce?/);
  if (bce) return -parseInt(bce[1]);

  const ceRange = s.match(/(\d+)[–\-](\d+)/);
  if (ceRange) return parseInt(ceRange[1]);

  return null;
}

async function main() {
  console.log("Seeding Smithsonian National Museum of Asian Art ancient objects…\n");

  const seen = new Set();
  const objects = [];

  for (const kw of KEYWORDS) {
    console.log(`Querying: "${kw}"`);
    const rows = await searchSI(kw);
    for (const r of rows) {
      const id = r.id ?? r.content?.descriptiveNonRepeating?.record_ID;
      if (seen.has(id)) continue;
      seen.add(id);
      const obj = extractObject(r);
      if (obj) objects.push(obj);
    }
    await sleep(REQUEST_DELAY);
  }

  console.log(`\nFound ${objects.length} valid ancient objects.\n`);

  if (objects.length === 0) {
    console.log("Nothing to seed.");
    return;
  }

  // Check cache
  const { data: existing } = await supabase
    .from("objects_cache").select("id").in("id", objects.map((o) => o.id));
  const existingSet = new Set((existing ?? []).map((r) => r.id));
  const toInsert = objects.filter((o) => !existingSet.has(o.id));
  console.log(`${toInsert.length} new, ${existingSet.size} already cached.\n`);

  let inserted = 0, skipped = 0;
  for (const obj of toInsert) {
    const { error } = await supabase.from("objects_cache").upsert(obj, { onConflict: "id" });
    if (error) { console.error(`\n✗ ${obj.id}: ${error.message}`); skipped++; }
    else inserted++;
    process.stdout.write(`  ${inserted + skipped}/${toInsert.length} · inserted ${inserted} · skipped ${skipped}\r`);
    await sleep(100);
  }

  console.log(`\n\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

main().catch(console.error);
