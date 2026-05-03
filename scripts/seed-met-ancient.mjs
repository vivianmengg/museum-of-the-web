// seed-met-ancient.mjs
// Seeds Met Museum objects from before 3000 BCE into objects_cache.
// Uses both department+date-range queries and keyword searches.
//
// Run: node scripts/seed-met-ancient.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";
const REQUEST_DELAY = 200;

const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Departments with ancient collections + date-range searches
const DEPT_SEARCHES = [
  { deptId: 10, name: "Egyptian Art" },
  { deptId: 3,  name: "Ancient Near Eastern Art" },
  { deptId: 13, name: "Greek and Roman Art" },
  { deptId: 6,  name: "Asian Art" },
  { deptId: 5,  name: "Arts of Africa, Oceania, Americas" },
];

// Keywords that surface pre-3000 BCE objects
const KEYWORDS = [
  "neolithic", "predynastic", "chalcolithic", "early dynastic",
  "jomon", "yangshao", "longshan", "majiayao", "liangzhu",
  "uruk", "ubaid", "sumerian", "badarian", "naqada",
  "prehistoric", "stone age", "bronze age early",
];

async function searchMetByDept(deptId, dateBegin, dateEnd) {
  const url = new URL(`${MET_BASE}/search`);
  url.searchParams.set("hasImages", "true");
  url.searchParams.set("isPublicDomain", "true");
  url.searchParams.set("q", "the");
  url.searchParams.set("departmentId", String(deptId));
  url.searchParams.set("dateBegin", String(dateBegin));
  url.searchParams.set("dateEnd", String(dateEnd));
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.objectIDs ?? [];
}

async function searchMetByKeyword(keyword) {
  const url = new URL(`${MET_BASE}/search`);
  url.searchParams.set("hasImages", "true");
  url.searchParams.set("isPublicDomain", "true");
  url.searchParams.set("q", keyword);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.objectIDs ?? [];
}

async function fetchMetObject(id) {
  const res = await fetch(`${MET_BASE}/objects/${id}`);
  if (!res.ok) return null;
  const d = await res.json();
  if (!d.primaryImageSmall && !d.primaryImage) return null;
  return {
    id:           `met-${id}`,
    institution:  "met",
    title:        d.title || "Untitled",
    date:         d.objectDate || "",
    culture:      d.culture || "",
    medium:       d.medium || "",
    image_url:    d.primaryImage || null,
    thumbnail_url: d.primaryImageSmall || d.primaryImage || null,
    department:   d.department || "",
    artist_name:  d.artistDisplayName || "",
    credit_line:  d.creditLine || "",
    dimensions:   d.dimensions || "",
    object_url:   d.objectURL || null,
    year_begin:   d.objectBeginDate ?? null,
    year_end:     d.objectEndDate   ?? null,
    cached_at:    new Date().toISOString(),
  };
}

async function main() {
  console.log("Seeding Met objects from before 3000 BCE…\n");

  const allIds = new Set();

  // Department + date range searches
  console.log("Department date-range searches (-7000 to -2999):");
  for (const { deptId, name } of DEPT_SEARCHES) {
    const ids = await searchMetByDept(deptId, -7000, -2999);
    console.log(`  ${name}: ${ids.length} results`);
    ids.forEach((id) => allIds.add(id));
    await sleep(REQUEST_DELAY);
  }

  // Keyword searches
  console.log("\nKeyword searches:");
  for (const keyword of KEYWORDS) {
    const ids = await searchMetByKeyword(keyword);
    console.log(`  "${keyword}": ${ids.length} results`);
    ids.forEach((id) => allIds.add(id));
    await sleep(REQUEST_DELAY);
  }

  console.log(`\n${allIds.size} unique Met IDs found across all searches.`);

  // Check which are already cached
  const cacheIds = [...allIds].map((id) => `met-${id}`);
  const { data: existing } = await supabase
    .from("objects_cache")
    .select("id")
    .in("id", cacheIds);
  const existingSet = new Set((existing ?? []).map((r) => r.id));

  const toFetch = [...allIds].filter((id) => !existingSet.has(`met-${id}`));
  console.log(`${toFetch.length} new objects to fetch (${existingSet.size} already cached).\n`);

  let inserted = 0, skipped = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const id = toFetch[i];
    process.stdout.write(`  ${i + 1}/${toFetch.length} · inserted ${inserted} · skipped ${skipped}\r`);

    const obj = await fetchMetObject(id);
    if (!obj) { skipped++; await sleep(REQUEST_DELAY); continue; }
    // Only keep objects that are actually ancient (before 3000 BCE)
    if (obj.year_begin === null || obj.year_begin > -3000) { skipped++; await sleep(REQUEST_DELAY); continue; }

    const { error } = await supabase.from("objects_cache").upsert(obj, { onConflict: "id" });
    if (error) { console.error("\nUpsert error:", error.message); skipped++; } else { inserted++; }
    await sleep(REQUEST_DELAY);
  }

  console.log(`\n\nDone. ${inserted} inserted, ${skipped} skipped.`);
  if (inserted > 0) console.log("Run: node scripts/generate-timeline-cache.mjs");
}

main().catch(console.error);
