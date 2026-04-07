// seed-met-highlights.mjs
// Seeds all Met "Is Highlight" objects (the collection's greatest hits) into objects_cache.
// Skips objects already in the cache to avoid redundant API calls.
//
// Run: node scripts/seed-met-highlights.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "readline";
import { Readable } from "stream";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const CSV_URL = "https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv";
const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1/objects";
const REQUEST_DELAY = 1200;
const DB_BATCH = 50;

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
function parseCSVLine(line) {
  const fields = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuote = false;
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(field); field = ""; }
      else { field += ch; }
    }
  }
  fields.push(field);
  return fields;
}

// ── Load highlight entries from CSV ─────────────────────────────────────────
async function loadHighlightEntries(existingIds) {
  console.log("Streaming Met Open Access CSV (~300 MB)…");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

  const COL = {
    isHighlight:  1,
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
    if (lineNo === 1) continue;

    const f = parseCSVLine(line);
    if (f[COL.isHighlight] !== "True" || f[COL.isPublic] !== "True") continue;

    const objectId = parseInt(f[COL.objectId]);
    if (!objectId) continue;

    // Skip already cached
    if (existingIds.has(`met-${objectId}`)) continue;

    const beginDate = parseInt(f[COL.beginDate]);
    const endDate   = parseInt(f[COL.endDate]);

    entries.push({
      objectId,
      department: f[COL.department] || "",
      title:      f[COL.title]      || "Untitled",
      culture:    f[COL.culture]    || "",
      objectDate: f[COL.objectDate] || "",
      yearBegin:  isNaN(beginDate) ? null : beginDate,
      yearEnd:    isNaN(endDate)   ? null : endDate,
    });
  }

  console.log(`Found ${entries.length.toLocaleString()} highlight objects not yet in cache.`);
  return entries;
}

// ── Fetch image + metadata from Met API ─────────────────────────────────────
async function fetchMetImage(objectId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${MET_API}/${objectId}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
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

// ── Checkpoint ───────────────────────────────────────────────────────────────
const CHECKPOINT = resolve(__dirname, "../.met-highlights-progress.json");

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

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Load existing cached IDs to skip them
  console.log("Loading existing cache IDs…");
  const { data: existingRows } = await supabase
    .from("objects_cache")
    .select("id")
    .like("id", "met-%");
  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  console.log(`${existingIds.size.toLocaleString()} Met objects already in cache.`);

  const entries = await loadHighlightEntries(existingIds);
  if (entries.length === 0) {
    console.log("All highlights already cached!");
    return;
  }

  // Load checkpoint
  let startIdx = 0;
  const insertedRef = { count: 0 };
  if (existsSync(CHECKPOINT)) {
    try {
      const cp = JSON.parse(readFileSync(CHECKPOINT, "utf8"));
      startIdx = cp.lastIdx ?? 0;
      insertedRef.count = cp.inserted ?? 0;
      console.log(`Resuming from ${startIdx}/${entries.length} (${insertedRef.count} inserted)`);
    } catch { /* start fresh */ }
  }

  const pending = [];

  for (let i = startIdx; i < entries.length; i++) {
    const entry = entries[i];
    const meta  = await fetchMetImage(entry.objectId);

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

    if ((i + 1) % 25 === 0) {
      writeFileSync(CHECKPOINT, JSON.stringify({ lastIdx: i + 1, inserted: insertedRef.count }));
      const pct = Math.round(((i + 1) / entries.length) * 100);
      process.stdout.write(`\r  ${i + 1}/${entries.length} (${pct}%)  ·  inserted ${insertedRef.count}`);
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
  console.log(`\n\nDone. ${insertedRef.count.toLocaleString()} highlight objects added.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
