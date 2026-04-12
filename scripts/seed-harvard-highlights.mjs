// seed-harvard-highlights.mjs
// Seeds Harvard Art Museums highlights into objects_cache.
// Pulls the top objects from the richest visual categories (Paintings, Sculpture, Vessels,
// Textile Arts, Manuscripts) — capped per-category to keep the total manageable (~1,500).
// Skips objects already in cache. Safe to re-run (upserts).
//
// Run: node scripts/seed-harvard-highlights.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const HAM_BASE      = "https://api.harvardartmuseums.org";
const API_KEY       = "01a8df91-8bbe-430d-8cf4-191d3fd90e3f";
const PAGE_SIZE     = 100;
const REQUEST_DELAY = 300;
const DB_BATCH      = 50;

// Pull the top N objects per category (sorted chronologically)
const CATEGORIES = [
  { classification: "Paintings",     limit: 500 },
  { classification: "Sculpture",     limit: 400 },
  { classification: "Vessels",       limit: 300 },
  { classification: "Textile Arts",  limit: 200 },
  { classification: "Manuscripts",   limit: 150 },
];

const FIELDS = "id,title,dated,datebegin,dateend,culture,medium,classification,department,primaryimageurl,url,creditline,dimensions,artistdisplayname";

// Harvard uses different department names — normalize so matchesCiv works.
function normalizeDept(dept, culture) {
  if (!dept) return "";
  const d = dept.toLowerCase();
  const c = (culture || "").toLowerCase();
  if (d.includes("ancient") || d.includes("byzantine")) {
    if (c.includes("egypt")) return "Egyptian Art";
    if (c.includes("greek") || c.includes("roman") || c.includes("etruscan")) return "Greek and Roman Art";
    if (c.includes("mesopotam") || c.includes("babylonian") || c.includes("assyrian") ||
        c.includes("sumerian") || c.includes("iranian") || c.includes("persian")) return "Ancient Near Eastern Art";
    return dept;
  }
  if (d.includes("asian")) return "Asian Art";
  if (d.includes("european") || d.includes("american")) return "European Paintings";
  if (d.includes("islamic")) return "Islamic Art";
  if (d.includes("african")) return "Arts of Africa, Oceania, and the Americas";
  return dept;
}

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
const CHECKPOINT = resolve(__dirname, "../.harvard-highlights-progress.json");

function loadCheckpoint() {
  if (!existsSync(CHECKPOINT)) return { categoryIdx: 0, page: 1, inserted: 0 };
  try { return JSON.parse(readFileSync(CHECKPOINT, "utf8")); }
  catch { return { categoryIdx: 0, page: 1, inserted: 0 }; }
}

function saveCheckpoint(categoryIdx, page, inserted) {
  writeFileSync(CHECKPOINT, JSON.stringify({ categoryIdx, page, inserted }));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Fetch a page for a given classification ──────────────────────────────────
async function fetchPage(classification, page) {
  const url = new URL(`${HAM_BASE}/object`);
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("classification", classification);
  url.searchParams.set("hasimage", "1");
  url.searchParams.set("imagepermissionlevel", "0");
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("size", String(PAGE_SIZE));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "datebegin");
  url.searchParams.set("sortorder", "asc");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
      if (res.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
      if (!res.ok) throw new Error(`HAM API ${res.status}`);
      const json = await res.json();
      return { data: json.records ?? [], totalRecords: json.info?.totalrecords ?? 0 };
    } catch (e) {
      if (attempt < 2) await sleep(1000);
      else throw e;
    }
  }
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
  console.log("Loading existing Harvard cache IDs…");
  const { data: existingRows } = await supabase
    .from("objects_cache")
    .select("id")
    .like("id", "harvard-%");
  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  console.log(`${existingIds.size} Harvard objects already in cache.`);

  const cp = loadCheckpoint();
  const insertedRef = { count: cp.inserted };
  const pending = [];

  for (let ci = cp.categoryIdx; ci < CATEGORIES.length; ci++) {
    const { classification, limit } = CATEGORIES[ci];
    const startPage = ci === cp.categoryIdx ? cp.page : 1;
    let fetched = (ci === cp.categoryIdx && startPage > 1) ? (startPage - 1) * PAGE_SIZE : 0;

    console.log(`\n[${classification}] fetching up to ${limit} objects…`);

    let page = startPage;
    let totalRecords = Infinity;

    while (fetched < limit) {
      const { data, totalRecords: tr } = await fetchPage(classification, page);
      if (page === startPage) {
        totalRecords = tr;
        console.log(`  ${tr} public-domain objects available`);
      }
      if (data.length === 0) break;

      for (const obj of data) {
        if (fetched >= limit) break;
        if (!obj.primaryimageurl) continue;
        if (existingIds.has(`harvard-${obj.id}`)) continue;

        const yb = typeof obj.datebegin === "number" ? obj.datebegin : null;
        const ye = typeof obj.dateend   === "number" ? obj.dateend   : null;
        const culture = obj.culture || "";

        pending.push({
          id:            `harvard-${obj.id}`,
          institution:   "harvard",
          title:         obj.title || "Untitled",
          date:          obj.dated || "",
          culture,
          medium:        obj.medium || "",
          image_url:     obj.primaryimageurl,
          thumbnail_url: obj.primaryimageurl ? obj.primaryimageurl + "?width=400" : null,
          image_width:   4,
          image_height:  3,
          department:    normalizeDept(obj.department, culture),
          artist_name:   obj.artistdisplayname || "",
          credit_line:   obj.creditline || "",
          dimensions:    obj.dimensions || "",
          object_url:    obj.url || null,
          year_begin:    yb,
          year_end:      ye ?? yb,
          cached_at:     new Date().toISOString(),
        });
        fetched++;
      }

      await flush(pending, insertedRef);
      saveCheckpoint(ci, page + 1, insertedRef.count);
      process.stdout.write(`\r  page ${page} · fetched ${fetched}/${Math.min(limit, totalRecords)} · inserted ${insertedRef.count}`);

      page++;
      await sleep(REQUEST_DELAY);
    }
  }

  // Final flush
  if (pending.length > 0) {
    const { error } = await supabase.from("objects_cache").upsert(pending, { onConflict: "id" });
    if (!error) insertedRef.count += pending.length;
  }

  saveCheckpoint(CATEGORIES.length, 1, insertedRef.count);
  console.log(`\n\nDone. ${insertedRef.count} Harvard objects inserted.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
