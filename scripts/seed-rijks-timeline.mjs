// seed-rijks-timeline.mjs
// Seeds the Rijksmuseum's public-domain collection into objects_cache.
// Requires a free API key from https://www.rijksmuseum.nl/en/research/conduct-research/data/overview-of-open-data-sets
// Add RIJKS_API_KEY=your_key to .env.local, then run:
//   node scripts/seed-rijks-timeline.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const RIJKS_BASE    = "https://www.rijksmuseum.nl/api/en/collection";
const PAGE_SIZE     = 100; // max allowed
const REQUEST_DELAY = 600; // ms between pages
const DB_BATCH      = 50;
const YEAR_MIN      = -3000;
const YEAR_MAX      = 2026;

// ── Env ──────────────────────────────────────────────────────────────────────
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;
const RIJKS_KEY    = env.RIJKS_API_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!RIJKS_KEY) {
  console.log("No RIJKS_API_KEY found — trying without one (may work for public endpoints)");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Checkpoint ───────────────────────────────────────────────────────────────
const CHECKPOINT = resolve(__dirname, "../.rijks-seed-progress.json");

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return { page: 0, inserted: 0 };
  try { return JSON.parse(readFileSync(CHECKPOINT, "utf8")); }
  catch { return { page: 0, inserted: 0 }; }
}

function saveCheckpoint(page, inserted) {
  writeFileSync(CHECKPOINT, JSON.stringify({ page, inserted }));
}

// ── Fetch a page ─────────────────────────────────────────────────────────────
async function fetchPage(page) {
  const url = new URL(RIJKS_BASE);
  if (RIJKS_KEY) url.searchParams.set("key", RIJKS_KEY);
  url.searchParams.set("imgonly", "true");
  url.searchParams.set("ps",      String(PAGE_SIZE));
  url.searchParams.set("p",       String(page));
  url.searchParams.set("s",       "chronologic"); // sort oldest first

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Rijks API error: ${res.status}`);
  const json = await res.json();
  return {
    artObjects: json.artObjects ?? [],
    count: json.count ?? 0,
  };
}

// ── Flush to Supabase ─────────────────────────────────────────────────────────
async function flush(pending, insertedRef) {
  while (pending.length >= DB_BATCH) {
    const batch = pending.splice(0, DB_BATCH);
    const { error } = await supabase.from("objects_cache").upsert(batch, { onConflict: "id" });
    if (error) console.error("\nSupabase error:", error.message);
    else insertedRef.count += batch.length;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const cp = loadCheckpoint();
  let { page: startPage, inserted } = cp;
  const insertedRef = { count: inserted };
  const pending = [];

  // First fetch to get total count
  const first = await fetchPage(startPage || 1);
  const totalObjects = first.count;
  const totalPages = Math.ceil(totalObjects / PAGE_SIZE);

  console.log(`Rijks collection: ${totalObjects.toLocaleString()} objects, ${totalPages} pages`);
  console.log(`Resuming from page ${startPage || 1} (${inserted} already inserted)`);

  // Process first page results if starting fresh
  if (startPage <= 1) {
    for (const obj of first.artObjects) {
      const row = transform(obj);
      if (row) pending.push(row);
    }
    await flush(pending, insertedRef);
    saveCheckpoint(2, insertedRef.count);
  }

  let page = Math.max(startPage, 2);

  while (page <= totalPages) {
    let artObjects;
    try {
      ({ artObjects } = await fetchPage(page));
    } catch (e) {
      console.error(`\nPage ${page} failed: ${e.message} — retrying in 3s`);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }

    for (const obj of artObjects) {
      const row = transform(obj);
      if (row) pending.push(row);
    }

    await flush(pending, insertedRef);
    saveCheckpoint(page + 1, insertedRef.count);

    const pct = Math.round((page / totalPages) * 100);
    process.stdout.write(`\r  page ${page}/${totalPages} (${pct}%)  ·  inserted ${insertedRef.count.toLocaleString()}`);

    page++;
    await new Promise((r) => setTimeout(r, REQUEST_DELAY));
  }

  // Final flush
  if (pending.length > 0) {
    const { error } = await supabase.from("objects_cache").upsert(pending, { onConflict: "id" });
    if (!error) insertedRef.count += pending.length;
  }

  saveCheckpoint(page, insertedRef.count);
  console.log(`\n\nDone. ${insertedRef.count.toLocaleString()} Rijks objects inserted.`);
}

function transform(obj) {
  const img = obj.webImage?.url;
  if (!img) return null;

  const yb = obj.dating?.yearEarly ?? null;
  const ye = obj.dating?.yearLate  ?? null;
  if (yb === null || yb < YEAR_MIN || yb > YEAR_MAX) return null;

  // Rijks image URLs: append ?w=800 for full, ?w=200 for thumb
  const imageUrl = img.endsWith("=s0") ? img.replace("=s0", "=s843") : img + "?w=843";
  const thumbUrl = img.endsWith("=s0") ? img.replace("=s0", "=s200") : img + "?w=200";

  return {
    id:            `rijks-${obj.objectNumber}`,
    institution:   "rijks",
    title:         obj.title || "Untitled",
    date:          obj.dating?.presentingDate || "",
    culture:       obj.productionPlaces?.join(", ") || "",
    medium:        obj.physicalMedium || "",
    image_url:     imageUrl,
    thumbnail_url: thumbUrl,
    image_width:   4,
    image_height:  3,
    department:    obj.classification?.classifications?.[0] || "",
    artist_name:   obj.principalOrFirstMaker || "",
    credit_line:   "",
    dimensions:    obj.subTitle || "",
    object_url:    `https://www.rijksmuseum.nl/en/collection/${obj.objectNumber}`,
    year_begin:    yb,
    year_end:      ye ?? yb,
    cached_at:     new Date().toISOString(),
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
