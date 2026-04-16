/**
 * Seed Smithsonian Freer/Sackler (National Museum of Asian Art) objects.
 * Quality signal: objects must come from Freer Gallery, Arthur M. Sackler Gallery,
 * or National Museum of Asian Art — one of the top Asian art collections in the US.
 *
 * Covers: Korean, Japanese, Chinese, South/Southeast Asian, Islamic, and African art
 * across all time periods (not just ancient).
 *
 * Run: node scripts/seed-smithsonian-asian.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SI_BASE = "https://api.si.edu/openaccess/api/v1.0";
const API_KEY = "EVekTdDao0rDvtY2X6RPOY7MmZhldD0TW0RjNLeN";
const DELAY = 300;

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Only objects from these sources — the quality filter
const ACCEPTED_SOURCES = new Set([
  "National Museum of Asian Art",
  "Freer Gallery of Art",
  "Arthur M. Sackler Gallery",
]);

// Keywords grouped by region — each gets its own search pass
const KEYWORD_GROUPS = {
  "Korean": [
    "joseon ceramics", "goryeo celadon", "korean lacquer", "korean bronze",
    "joseon painting", "korean porcelain", "silla gold", "koryo celadon",
    "korean screen", "korean furniture",
  ],
  "Japanese": [
    "edo period painting", "meiji lacquer", "heian sculpture", "kamakura buddha",
    "japanese screen", "japanese lacquerware", "japanese bronze", "japanese ceramics",
    "momoyama tea", "noh costume", "japanese ink painting", "japanese sword",
    "japanese armor", "japanese textile", "rimpa painting",
  ],
  "Chinese": [
    "ming dynasty ceramics", "qing dynasty porcelain", "tang dynasty sculpture",
    "song dynasty painting", "chinese bronze ritual", "chinese jade",
    "chinese lacquer", "chinese silk", "han dynasty", "chinese landscape painting",
    "chinese calligraphy", "yuan dynasty", "chinese cloisonne",
  ],
  "South & SE Asian": [
    "indian sculpture", "gandharan sculpture", "chola bronze", "mughal painting",
    "rajput painting", "cambodian khmer", "thai buddha", "javanese sculpture",
    "tibetan thangka", "nepali sculpture", "indian textile",
  ],
  "Islamic": [
    "safavid ceramics", "persian miniature", "islamic metalwork", "mamluk",
    "ottoman tile", "persian carpet", "islamic manuscript",
  ],
  "African": [
    "african sculpture", "yoruba", "benin bronze", "akan goldwork",
    "kuba textile", "dogon",
  ],
};

async function searchSI(keyword) {
  const url = new URL(`${SI_BASE}/search`);
  url.searchParams.set("q", keyword);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("rows", "100");
  url.searchParams.set("online_media_type", "Images");
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.response?.rows ?? [];
}

function extractObject(r) {
  const dnr = r.content?.descriptiveNonRepeating;
  const freetext = r.content?.freetext;

  if (!ACCEPTED_SOURCES.has(dnr?.data_source)) return null;

  const media = dnr?.online_media?.media?.[0];
  const thumbnail = media?.thumbnail;
  if (!thumbnail) return null;

  const title = r.title || "Untitled";
  // Skip library/archive records
  if (/\b(book|publication|library|volume|archives?)\b/i.test(title)) return null;

  const dateStr = freetext?.date?.[0]?.content ?? "";
  const culture = freetext?.culture?.[0]?.content ?? "";
  const medium = freetext?.physicalDescription?.[0]?.content ?? "";
  const creditLine = freetext?.creditLine?.[0]?.content ?? "";
  const dept = freetext?.setName?.[0]?.content ?? dnr?.unit_name ?? "";

  return {
    id: `smithsonian-${r.id ?? dnr?.record_ID}`,
    institution: "smithsonian",
    title,
    date: dateStr,
    culture,
    medium,
    image_url:     media?.content ?? thumbnail,
    thumbnail_url: thumbnail,
    image_width:   4,
    image_height:  3,
    department:    dept,
    artist_name:   freetext?.name?.[0]?.content ?? "",
    credit_line:   creditLine,
    dimensions:    freetext?.physicalDescription?.[1]?.content ?? "",
    object_url:    dnr?.record_link ?? null,
    year_begin:    null,
    year_end:      null,
    cached_at:     new Date().toISOString(),
  };
}

async function main() {
  console.log("Seeding Smithsonian Freer/Sackler — National Museum of Asian Art\n");

  const seen = new Set();
  const objects = [];

  for (const [group, keywords] of Object.entries(KEYWORD_GROUPS)) {
    console.log(`\n── ${group} ──`);
    for (const kw of keywords) {
      process.stdout.write(`  "${kw}"… `);
      const rows = await searchSI(kw);
      let added = 0;
      for (const r of rows) {
        const id = r.id ?? r.content?.descriptiveNonRepeating?.record_ID;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const obj = extractObject(r);
        if (obj) { objects.push(obj); added++; }
      }
      console.log(`${added} new objects (${objects.length} total)`);
      await sleep(DELAY);
    }
  }

  console.log(`\nTotal valid Freer/Sackler objects: ${objects.length}\n`);
  if (objects.length === 0) { console.log("Nothing to seed."); return; }

  // Check cache
  const existingSet = new Set();
  for (let i = 0; i < objects.length; i += 500) {
    const { data } = await supabase.from("objects_cache").select("id").in("id", objects.slice(i, i + 500).map((o) => o.id));
    (data ?? []).forEach((r) => existingSet.add(r.id));
  }
  const toInsert = objects.filter((o) => !existingSet.has(o.id));
  console.log(`${existingSet.size} already cached, ${toInsert.length} to insert.\n`);

  let inserted = 0, skipped = 0;
  for (const obj of toInsert) {
    const { error } = await supabase.from("objects_cache").upsert(obj, { onConflict: "id" });
    if (error) { console.error(`\n✗ ${obj.id}: ${error.message}`); skipped++; }
    else inserted++;
    process.stdout.write(`  ${inserted + skipped}/${toInsert.length} · inserted ${inserted} · skipped ${skipped}\r`);
    await sleep(100);
  }

  console.log(`\n\nDone. ${inserted} inserted, ${skipped} skipped.`);
  console.log("Run classify-geography.mjs next to tag country/continent.");
}

main().catch(console.error);
