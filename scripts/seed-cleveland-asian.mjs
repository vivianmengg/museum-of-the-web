/**
 * Seed Cleveland Museum of Art Asian, African, and Islamic art into objects_cache.
 * Uses department filter as the quality/relevancy signal — these are the museum's
 * own curated specialty departments, not a random pull.
 *
 * Departments seeded:
 *   Korean Art (~441), Chinese Art (~2450), Japanese Art (~3237),
 *   Indian and Southeast Asian Art (~3377), African Art (~378), Islamic Art (~294)
 *
 * Run: node scripts/seed-cleveland-asian.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CMA_BASE = "https://openaccess-api.clevelandart.org/api";
const DELAY = 150;

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const DEPARTMENTS = [
  "Korean Art",
  "Chinese Art",
  "Japanese Art",
  "Indian and Southeast Asian Art",
  "African Art",
  "Islamic Art",
];

async function fetchDepartment(department) {
  const results = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const url = new URL(`${CMA_BASE}/artworks`);
    url.searchParams.set("has_image", "1");
    url.searchParams.set("department", department);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("skip", String(skip));

    const res = await fetch(url.toString());
    if (!res.ok) { console.error(`  HTTP ${res.status}`); break; }
    const data = await res.json();
    const records = data.data ?? [];
    results.push(...records);
    process.stdout.write(`  ${department}: ${results.length} / ${data.info?.total ?? "?"}\r`);
    if (records.length < limit) break;
    skip += limit;
    await sleep(DELAY);
  }
  return results;
}

function rowFromRecord(r) {
  const images = r.images;
  const thumbnailUrl = images?.web?.url ?? images?.print?.url ?? null;
  const imageUrl = images?.full?.url ?? thumbnailUrl;
  if (!thumbnailUrl) return null;

  const culture = Array.isArray(r.culture) ? r.culture.join(", ") : (r.culture ?? "");
  const artistName = r.creators?.[0]?.description ?? "";

  return {
    id:            `cleveland-${r.id}`,
    institution:   "cleveland",
    title:         r.title || "Untitled",
    date:          r.creation_date || "",
    culture,
    medium:        r.technique || r.medium || "",
    image_url:     imageUrl,
    thumbnail_url: thumbnailUrl,
    image_width:   4,
    image_height:  3,
    department:    r.department || "",
    artist_name:   artistName,
    credit_line:   r.creditline || "",
    dimensions:    r.measurements || "",
    object_url:    r.url || null,
    year_begin:    r.creation_date_earliest ?? null,
    year_end:      r.creation_date_latest   ?? null,
    cached_at:     new Date().toISOString(),
  };
}

async function main() {
  console.log("Seeding Cleveland Museum of Art — Asian, African & Islamic departments\n");

  for (const dept of DEPARTMENTS) {
    console.log(`\nFetching: ${dept}`);
    const records = await fetchDepartment(dept);
    console.log(`\n  Found ${records.length} objects`);

    // Check which are already cached
    const ids = records.map((r) => `cleveland-${r.id}`);
    const existingSet = new Set();
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await supabase.from("objects_cache").select("id").in("id", ids.slice(i, i + 500));
      (data ?? []).forEach((r) => existingSet.add(r.id));
    }

    const toInsert = records.filter((r) => !existingSet.has(`cleveland-${r.id}`));
    console.log(`  ${existingSet.size} already cached, ${toInsert.length} to insert`);

    let inserted = 0, skipped = 0;
    for (const r of toInsert) {
      const row = rowFromRecord(r);
      if (!row) { skipped++; continue; }

      const { error } = await supabase.from("objects_cache").upsert(row, { onConflict: "id" });
      if (error) { console.error(`\n  ✗ cleveland-${r.id}: ${error.message}`); skipped++; }
      else inserted++;
      process.stdout.write(`  ${inserted + skipped}/${toInsert.length} · inserted ${inserted} · skipped ${skipped}\r`);
      await sleep(80);
    }
    console.log(`\n  Done: ${inserted} inserted, ${skipped} skipped`);
  }

  console.log("\n\nAll departments complete. Run classify-geography.mjs next to tag country/continent.");
}

main().catch(console.error);
