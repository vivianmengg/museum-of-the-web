// seed-cleveland-ancient.mjs
// Seeds Cleveland Museum of Art objects from -7000 to -3000 BCE.
//
// Run: node scripts/seed-cleveland-ancient.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CMA_BASE = "https://openaccess-api.clevelandart.org/api";
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

async function fetchAll() {
  const results = [];
  let skip = 0;
  const limit = 100;

  while (true) {
    const url = new URL(`${CMA_BASE}/artworks`);
    url.searchParams.set("has_image", "1");
    url.searchParams.set("created_after", "-7000");
    url.searchParams.set("created_before", "-3000");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("skip", String(skip));

    const res = await fetch(url.toString());
    if (!res.ok) break;
    const data = await res.json();
    const records = data.data ?? [];
    results.push(...records);
    process.stdout.write(`  fetched ${results.length} / ${data.info?.total ?? "?"}\r`);
    if (records.length < limit) break;
    skip += limit;
    await sleep(REQUEST_DELAY);
  }
  console.log();
  return results;
}

async function main() {
  console.log("Fetching Cleveland Museum objects from -7000 to -3000 BCE…\n");

  const records = await fetchAll();
  console.log(`Found ${records.length} objects.\n`);

  // Check which are already cached
  const ids = records.map((r) => `aic-${r.id}`); // Cleveland uses "aic" prefix? No — use "cleveland"
  const cacheIds = records.map((r) => `cleveland-${r.id}`);
  const { data: existing } = await supabase
    .from("objects_cache")
    .select("id")
    .in("id", cacheIds);
  const existingSet = new Set((existing ?? []).map((r) => r.id));

  const toInsert = records.filter((r) => !existingSet.has(`cleveland-${r.id}`));
  console.log(`${toInsert.length} new objects to insert (${existingSet.size} already cached).\n`);

  let inserted = 0, skipped = 0;

  for (const r of toInsert) {
    const images = r.images;
    const thumbnailUrl = images?.web?.url ?? images?.print?.url ?? null;
    const imageUrl = images?.full?.url ?? thumbnailUrl;

    if (!thumbnailUrl) { skipped++; continue; }

    const culture = Array.isArray(r.culture) ? r.culture.join(", ") : (r.culture ?? "");

    const row = {
      id:            `cleveland-${r.id}`,
      institution:   "cleveland",
      title:         r.title || "Untitled",
      date:          r.creation_date || "",
      culture,
      medium:        r.technique || r.medium || "",
      image_url:     imageUrl,
      thumbnail_url: thumbnailUrl,
      department:    r.department || "",
      artist_name:   r.creators?.[0]?.description || "",
      credit_line:   r.creditline || "",
      dimensions:    r.measurements || "",
      object_url:    r.url || null,
      year_begin:    r.creation_date_earliest ?? null,
      year_end:      r.creation_date_latest   ?? null,
      cached_at:     new Date().toISOString(),
    };

    const { error } = await supabase.from("objects_cache").upsert(row, { onConflict: "id" });
    if (error) { console.error(`\n  ✗ cleveland-${r.id}: ${error.message}`); skipped++; }
    else { inserted++; }
    process.stdout.write(`  ${inserted + skipped}/${toInsert.length} · inserted ${inserted} · skipped ${skipped}\r`);
    await sleep(100);
  }

  console.log(`\n\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

main().catch(console.error);
