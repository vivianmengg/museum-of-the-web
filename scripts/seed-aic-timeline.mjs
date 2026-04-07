// seed-aic-timeline.mjs
// Seeds the Art Institute of Chicago's public-domain collection into objects_cache.
// No API key required. Rate limit: ~60 req/min — we stay well under.
//
// Run: node scripts/seed-aic-timeline.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const AIC_BASE    = "https://api.artic.edu/api/v1";
const IMAGE_BASE  = "https://www.artic.edu/iiif/2";
const PAGE_SIZE   = 100;
const REQUEST_DELAY = 500; // ms between pages (well under 60/min)
const DB_BATCH    = 50;
const YEAR_MIN    = -3000;
const YEAR_MAX    = 2026;

const FIELDS = [
  "id", "title", "date_display", "date_start", "date_end",
  "artist_display", "medium_display", "dimensions",
  "credit_line", "department_title", "place_of_origin",
  "culture_display", "image_id", "is_public_domain",
].join(",");

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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Checkpoint ───────────────────────────────────────────────────────────────
const CHECKPOINT = resolve(__dirname, "../.aic-seed-progress.json");

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return { page: 1, inserted: 0 };
  try { return JSON.parse(readFileSync(CHECKPOINT, "utf8")); }
  catch { return { page: 1, inserted: 0 }; }
}

function saveCheckpoint(page, inserted) {
  writeFileSync(CHECKPOINT, JSON.stringify({ page, inserted }));
}

// ── Fetch a page of AIC artworks ─────────────────────────────────────────────
async function fetchPage(page) {
  const url = new URL(`${AIC_BASE}/artworks/search`);
  url.searchParams.set("query[term][is_public_domain]", "true");
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("limit", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), {
    headers: { "AIC-User-Agent": "museum-of-the-web/1.0 (educational project)" },
  });
  if (!res.ok) throw new Error(`AIC API error: ${res.status}`);
  const json = await res.json();
  return { data: json.data ?? [], totalPages: json.pagination?.total_pages ?? 0 };
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

  console.log(`Starting AIC seed from page ${startPage} (${inserted} already inserted)`);

  let totalPages = Infinity;
  let page = startPage;

  while (page <= totalPages) {
    const { data, totalPages: tp } = await fetchPage(page);
    totalPages = tp;

    for (const obj of data) {
      if (!obj.image_id) continue;
      if (!obj.is_public_domain) continue;

      const yb = typeof obj.date_start === "number" ? obj.date_start : null;
      const ye = typeof obj.date_end   === "number" ? obj.date_end   : null;
      if (yb === null || yb < YEAR_MIN || yb > YEAR_MAX) continue;

      const thumbUrl = `${IMAGE_BASE}/${obj.image_id}/full/200,/0/default.jpg`;
      const imageUrl = `${IMAGE_BASE}/${obj.image_id}/full/843,/0/default.jpg`;

      pending.push({
        id:            `aic-${obj.id}`,
        institution:   "aic",
        title:         obj.title || "Untitled",
        date:          obj.date_display || "",
        culture:       obj.culture_display || obj.place_of_origin || "",
        medium:        obj.medium_display || "",
        image_url:     imageUrl,
        thumbnail_url: thumbUrl,
        image_width:   4,
        image_height:  3,
        department:    obj.department_title || "",
        artist_name:   obj.artist_display?.split("\n")[0] || "",
        credit_line:   obj.credit_line || "",
        dimensions:    obj.dimensions || "",
        object_url:    `https://www.artic.edu/artworks/${obj.id}`,
        year_begin:    yb,
        year_end:      ye ?? yb,
        cached_at:     new Date().toISOString(),
      });
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
  console.log(`\n\nDone. ${insertedRef.count.toLocaleString()} AIC objects inserted.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
