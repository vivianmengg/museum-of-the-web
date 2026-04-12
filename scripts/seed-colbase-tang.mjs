// seed-colbase-tang.mjs
// Seeds Tang dynasty objects from ColBase via the Japan Search API.
// Japanese national museums hold significant Tang-era Chinese collections.
//
// Run: node scripts/seed-colbase-tang.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = "https://jpsearch.go.jp/api/item/search/jps-cross";
const REQUEST_DELAY = 250;

const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const TANG_YEAR_BEGIN = 618;
const TANG_YEAR_END   = 907;

const JP_PERIOD_RE = /\b(edo|meiji|taisho|showa|heian|kamakura|muromachi|momoyama|nara|asuka|kofun|yayoi|jomon|reiwa|heisei|azuchi|江戸|明治|大正|昭和|平安|鎌倉|室町|桃山|奈良|飛鳥|古墳|弥生|縄文)\b/i;

const KEYWORDS = ["Tang", "唐時代", "唐代", "唐三彩"];
const MAX_PER_KEYWORD = 200;

async function fetchKeyword(keyword, maxRows) {
  const results = [];
  const size = 100;
  let from = 0;

  while (results.length < maxRows) {
    const url = new URL(BASE);
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("f-contents", "thumb");
    url.searchParams.set("f-db", "cobas");
    url.searchParams.set("size", String(size));
    url.searchParams.set("from", String(from));

    const res = await fetch(url.toString());
    if (!res.ok) break;
    const data = await res.json();
    const list = data.list ?? [];
    if (!list.length) break;

    results.push(...list);
    if (list.length < size || results.length >= data.hit) break;
    from += size;
    await sleep(REQUEST_DELAY);
  }

  return results.slice(0, maxRows);
}

function parseYear(temporals) {
  const eng = temporals.find((t) => /[a-z]/i.test(t)) ?? temporals[0] ?? "";
  const s = eng.toLowerCase();

  const specific = s.match(/\b(\d{4})\b/);
  if (specific) return parseInt(specific[1]);

  const centuryRange = s.match(/(\d+)(?:st|nd|rd|th)[–\-~](\d+)(?:st|nd|rd|th)\s+century/);
  if (centuryRange) {
    const mid = (parseInt(centuryRange[1]) + parseInt(centuryRange[2])) / 2;
    return Math.round((mid - 1) * 100 + 50);
  }
  const century = s.match(/(\d+)(?:st|nd|rd|th)\s+century/);
  if (century) return (parseInt(century[1]) - 1) * 100 + 50;

  const bce = s.match(/(\d+)\s*bce?/);
  if (bce) return -parseInt(bce[1]);

  return null;
}

function extractObject(item) {
  const common = item.common ?? {};
  const thumb = common.thumbnailUrl?.[0];
  if (!thumb) return null;

  const titleEn = common.titleEn || null;
  const titleJa = common.title || "Untitled";
  const title = titleEn || titleJa;

  const temporals = common.temporal ?? [];
  const dateStr = temporals.find((t) => /[a-z]/i.test(t)) ?? temporals[0] ?? "";

  const parsedYear = parseYear(temporals);
  const year = parsedYear ?? Math.round((TANG_YEAR_BEGIN + TANG_YEAR_END) / 2);

  // Classify by period: if the date mentions a Japanese era, it's Japanese art
  // (e.g. Edo-period paintings of Chinese themes are Japanese, not Chinese)
  const culture = JP_PERIOD_RE.test(dateStr) ? "Japanese" : "Chinese";

  const medium = item["cobas-12-s"] ?? "";
  const designation = item["cobas-3-s"] ?? "";
  const department = designation ? `Asian Art · ${designation}` : "Asian Art";

  return {
    id: `colbase-${item.id ?? common.id}`,
    institution: "colbase",
    title,
    date: dateStr,
    culture,
    medium,
    image_url: common.contentsUrl?.[0] ?? thumb,
    thumbnail_url: thumb,
    department,
    artist_name: "",
    credit_line: common.contributor?.find((c) => /museum/i.test(c)) ?? "",
    dimensions: "",
    object_url: common.linkUrl ?? null,
    year_begin: year,
    year_end: year,
    cached_at: new Date().toISOString(),
  };
}

async function main() {
  console.log("Seeding ColBase Tang dynasty objects…\n");

  const seen = new Set();
  const objects = [];

  for (const keyword of KEYWORDS) {
    console.log(`Fetching "${keyword}" (up to ${MAX_PER_KEYWORD})…`);
    const rows = await fetchKeyword(keyword, MAX_PER_KEYWORD);
    console.log(`  → ${rows.length} raw results`);

    for (const row of rows) {
      const id = `colbase-${row.id ?? row.common?.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const obj = extractObject(row);
      if (obj) objects.push(obj);
    }
    await sleep(REQUEST_DELAY);
  }

  console.log(`\nFound ${objects.length} valid objects.\n`);
  if (!objects.length) { console.log("Nothing to seed."); return; }

  let inserted = 0, skipped = 0;
  for (const obj of objects) {
    const { error } = await supabase.from("objects_cache").upsert(obj, { onConflict: "id" });
    if (error) { console.error(`\n✗ ${obj.id}: ${error.message}`); skipped++; }
    else inserted++;
    process.stdout.write(`  ${inserted + skipped}/${objects.length} · inserted ${inserted}\r`);
    await sleep(100);
  }

  console.log(`\n\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

main().catch(console.error);
