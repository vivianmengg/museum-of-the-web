// seed-harvard-neolithic-china.mjs
// Seeds Harvard Art Museums Neolithic Chinese objects into objects_cache.
// Targets objects with Chinese culture + Neolithic period/classification.
//
// Run: node scripts/seed-harvard-neolithic-china.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HAM_BASE      = "https://api.harvardartmuseums.org";
const API_KEY       = "01a8df91-8bbe-430d-8cf4-191d3fd90e3f";
const REQUEST_DELAY = 300;

const FIELDS = "id,title,dated,datebegin,dateend,culture,medium,classification,department,primaryimageurl,url,creditline,dimensions,artistdisplayname";

// ── Env ──────────────────────────────────────────────────────────────────────
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchPage(params) {
  const url = new URL(`${HAM_BASE}/object`);
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("hasimage", "1");
  url.searchParams.set("size", "100");
  url.searchParams.set("fields", FIELDS);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) return { records: [], info: { next: null, totalrecords: 0 } };
  return res.json();
}

async function fetchAll(params) {
  const results = [];
  let page = 1;
  while (true) {
    const data = await fetchPage({ ...params, page });
    const records = data.records ?? [];
    results.push(...records);
    process.stdout.write(`  fetched ${results.length} / ${data.info?.totalrecords ?? "?"}\r`);
    if (!data.info?.next || records.length === 0) break;
    page++;
    await sleep(REQUEST_DELAY);
  }
  console.log();
  return results;
}

async function main() {
  console.log("Fetching Harvard Neolithic Chinese objects…\n");

  // Strategy: search by culture=Chinese + period=Neolithic, and also
  // by classification=Neolithic Pottery/Jade which Harvard uses heavily
  const queries = [
    { keyword: "Yangshao",  sortby: "datebegin", sortorder: "asc" },
    { keyword: "Longshan",  sortby: "datebegin", sortorder: "asc" },
    { keyword: "Dawenkou",  sortby: "datebegin", sortorder: "asc" },
    { keyword: "Liangzhu",  sortby: "datebegin", sortorder: "asc" },
    { keyword: "Majiayao",  sortby: "datebegin", sortorder: "asc" },
    { keyword: "Hongshan",  sortby: "datebegin", sortorder: "asc" },
    { culture: "Chinese", keyword: "Neolithic", sortby: "datebegin", sortorder: "asc" },
  ];

  const seen = new Set();
  const all = [];

  for (const q of queries) {
    console.log(`Querying: ${JSON.stringify(q)}`);
    const records = await fetchAll(q);
    for (const r of records) {
      if (!seen.has(r.id) && r.primaryimageurl) {
        seen.add(r.id);
        all.push(r);
      }
    }
    await sleep(REQUEST_DELAY);
  }

  console.log(`\nFound ${all.length} unique objects with images.`);

  // Filter to plausible Neolithic date range (-6000 to -1500 BCE)
  const neolithic = all.filter((r) => {
    const begin = r.datebegin ?? 0;
    const end   = r.dateend   ?? 0;
    return begin <= -1500 && end <= 500;
  });

  console.log(`${neolithic.length} objects within Neolithic date range.`);

  if (neolithic.length === 0) {
    console.log("Nothing to seed.");
    return;
  }

  // Check which are already cached
  const ids = neolithic.map((r) => `harvard-${r.id}`);
  const { data: existing } = await supabase
    .from("objects_cache")
    .select("id")
    .in("id", ids);
  const existingSet = new Set((existing ?? []).map((r) => r.id));

  const toInsert = neolithic.filter((r) => !existingSet.has(`harvard-${r.id}`));
  console.log(`${toInsert.length} new objects to insert (${existingSet.size} already cached).\n`);

  let patched = 0;
  for (const r of toInsert) {
    const row = {
      id:            `harvard-${r.id}`,
      institution:   "harvard",
      title:         r.title || "Untitled",
      date:          r.dated || "",
      culture:       r.culture || "Chinese",
      medium:        r.medium || "",
      image_url:     r.primaryimageurl || null,
      thumbnail_url: r.primaryimageurl || null,
      department:    "Asian Art",
      artist_name:   r.artistdisplayname || "",
      credit_line:   r.creditline || "",
      dimensions:    r.dimensions || "",
      object_url:    r.url || null,
      year_begin:    r.datebegin ?? null,
      year_end:      r.dateend   ?? null,
      cached_at:     new Date().toISOString(),
    };

    const { error } = await supabase.from("objects_cache").upsert(row, { onConflict: "id" });
    if (error) {
      console.error(`  ✗ harvard-${r.id}: ${error.message}`);
    } else {
      patched++;
      process.stdout.write(`  ${patched}/${toInsert.length} inserted\r`);
    }
    await sleep(100);
  }

  console.log(`\nDone. ${patched} objects seeded.`);
}

main().catch(console.error);
