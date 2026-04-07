// seed-met-timeline.mjs
// Streams the Met Open Access CSV, filters to Is_Timeline_Work + Is_Public_Domain,
// fetches each object from the Met API for image URLs, and upserts into objects_cache.
//
// Run ONCE after applying supabase-timeline-migration.sql:
//   node scripts/seed-met-timeline.mjs
//
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "readline";
import { Readable } from "stream";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const CSV_URL =
  "https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv";
const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1/objects";
const REQUEST_DELAY = 1200; // ms between individual Met API requests (sequential, not parallel)
const DB_BATCH      = 50;   // flush to Supabase every N rows with images

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; museum-of-the-web/1.0; educational project)",
};

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

// ── CSV parser ───────────────────────────────────────────────────────────────
// Handles quoted fields (including embedded commas). Assumes no multi-line fields.
function parseCSVLine(line) {
  const fields = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuote = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(field); field = ""; }
      else { field += ch; }
    }
  }
  fields.push(field);
  return fields;
}

// ── Stream & filter CSV ──────────────────────────────────────────────────────
async function loadTimelineEntries() {
  console.log("Streaming Met Open Access CSV (~300 MB)…");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

  // Column indices (0-based) from header row
  // Object Number,Is Highlight,Is Timeline Work,Is Public Domain,Object ID,
  // Gallery Number,Department,...,Title,Culture,...,Object Date,Object Begin Date,Object End Date
  const COL = {
    isTimeline:   2,
    isPublic:     3,
    objectId:     4,
    department:   6,
    title:        9,
    culture:      10,
    objectDate:   28,
    beginDate:    29,
    endDate:      30,
  };

  const entries = [];
  const rl = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;
    if (lineNo === 1) continue; // skip header

    const f = parseCSVLine(line);
    if (f[COL.isTimeline] !== "True" || f[COL.isPublic] !== "True") continue;

    const objectId   = parseInt(f[COL.objectId]);
    const beginDate  = parseInt(f[COL.beginDate]);
    const endDate    = parseInt(f[COL.endDate]);
    if (!objectId || isNaN(beginDate)) continue;
    // Keep only objects within our timeline range
    if (beginDate < -3000 || beginDate > 1900) continue;

    entries.push({
      objectId,
      department: f[COL.department] || "",
      title:      f[COL.title]      || "Untitled",
      culture:    f[COL.culture]    || "",
      objectDate: f[COL.objectDate] || "",
      yearBegin:  beginDate,
      yearEnd:    isNaN(endDate) ? beginDate : endDate,
    });
  }

  console.log(`Found ${entries.length.toLocaleString()} timeline objects in range.`);
  return entries;
}

// ── Fetch image URL from Met API ─────────────────────────────────────────────
async function fetchMetImage(objectId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${MET_API}/${objectId}`, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      // WAF blocks return 200 + HTML — detect and back off
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      const d = await res.json();
      return {
        thumbnailUrl: d.primaryImageSmall || d.primaryImage || null,
        imageUrl:     d.primaryImage      || null,
        medium:       d.medium            || "",
        artistName:   d.artistDisplayName || "",
        creditLine:   d.creditLine        || "",
        dimensions:   d.dimensions        || "",
        objectUrl:    d.objectURL         || null,
      };
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const CHECKPOINT = resolve(__dirname, "../.met-seed-progress.json");

async function flushPending(pending, insertedRef) {
  while (pending.length >= DB_BATCH) {
    const batch = pending.splice(0, DB_BATCH);
    const { error } = await supabase
      .from("objects_cache")
      .upsert(batch, { onConflict: "id" });
    if (error) console.error("\nSupabase error:", error.message);
    else insertedRef.count += batch.length;
  }
}

async function main() {
  const entries = await loadTimelineEntries();

  // Load checkpoint so we can resume across sessions
  let startIdx = 0;
  const insertedRef = { count: 0 };
  if (existsSync(CHECKPOINT)) {
    try {
      const cp = JSON.parse(readFileSync(CHECKPOINT, "utf8"));
      startIdx = cp.lastIdx ?? 0;
      insertedRef.count = cp.inserted ?? 0;
      console.log(`Resuming from ${startIdx.toLocaleString()} / ${entries.length.toLocaleString()} (${insertedRef.count} already inserted)`);
    } catch { /* corrupt checkpoint, start fresh */ }
  }

  const pending = [];
  let fetched = startIdx;

  for (let i = startIdx; i < entries.length; i++) {
    const entry = entries[i];
    const meta  = await fetchMetImage(entry.objectId);
    fetched++;

    if (meta?.thumbnailUrl) {
      pending.push({
        id:            `met-${entry.objectId}`,
        institution:   "met",
        title:         entry.title,
        date:          entry.objectDate,
        culture:       entry.culture,
        medium:        meta.medium,
        image_url:     meta.imageUrl,
        thumbnail_url: meta.thumbnailUrl,
        image_width:   4,
        image_height:  3,
        department:    entry.department,
        artist_name:   meta.artistName,
        credit_line:   meta.creditLine,
        dimensions:    meta.dimensions,
        object_url:    meta.objectUrl,
        year_begin:    entry.yearBegin,
        year_end:      entry.yearEnd,
        cached_at:     new Date().toISOString(),
      });
    }

    await flushPending(pending, insertedRef);

    // Save progress every 50 objects so we can resume if interrupted
    if (fetched % 50 === 0) {
      writeFileSync(CHECKPOINT, JSON.stringify({ lastIdx: i + 1, inserted: insertedRef.count }));
      const pct = Math.round((fetched / entries.length) * 100);
      process.stdout.write(
        `\r  ${fetched.toLocaleString()}/${entries.length.toLocaleString()} (${pct}%)  ·  inserted ${insertedRef.count.toLocaleString()}`
      );
    }

    await new Promise((r) => setTimeout(r, REQUEST_DELAY));
  }

  // Final flush
  if (pending.length > 0) {
    const { error } = await supabase
      .from("objects_cache")
      .upsert(pending, { onConflict: "id" });
    if (!error) insertedRef.count += pending.length;
  }

  writeFileSync(CHECKPOINT, JSON.stringify({ lastIdx: entries.length, inserted: insertedRef.count }));
  console.log(`\n\nDone. ${insertedRef.count.toLocaleString()} Met timeline objects in cache.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
