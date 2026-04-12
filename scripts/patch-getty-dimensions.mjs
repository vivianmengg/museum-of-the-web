// patch-getty-dimensions.mjs
// Backfills image_width / image_height for all Getty objects by fetching
// the IIIF info.json for each image (one small HTTP request per object).
//
// Run: node scripts/patch-getty-dimensions.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const CONCURRENCY = 10;
const DELAY_MS = 150;

function iiifInfoUrl(thumbnailUrl) {
  // thumbnail: https://media.getty.edu/iiif/image/{id}/full/!300,300/0/default.jpg
  const m = thumbnailUrl?.match(/\/iiif\/image\/([^/]+)\//);
  if (!m) return null;
  return `https://media.getty.edu/iiif/image/${m[1]}/info.json`;
}

async function fetchDimensions(thumbnailUrl) {
  const url = iiifInfoUrl(thumbnailUrl);
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.width && json.height) return { w: json.width, h: json.height };
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Fetching Getty objects with default 4x3 dimensions…");
  const { data: rows, error } = await supabase
    .from("objects_cache")
    .select("id, thumbnail_url")
    .ilike("id", "getty-%")
    .eq("image_width", 4)
    .eq("image_height", 3)
    .not("thumbnail_url", "is", null)
    .limit(2000);

  if (error) { console.error(error); return; }
  console.log(`Found ${rows.length} objects to patch.\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (row) => {
      const dims = await fetchDimensions(row.thumbnail_url);
      if (!dims) { failed++; return; }
      const { error: e } = await supabase
        .from("objects_cache")
        .update({ image_width: dims.w, image_height: dims.h })
        .eq("id", row.id);
      if (e) { failed++; }
      else { updated++; }
    }));
    process.stdout.write(`  ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length} · ${updated} updated · ${failed} failed\r`);
    await sleep(DELAY_MS);
  }

  console.log(`\n\nDone. ${updated} updated, ${failed} failed.`);
}

main().catch(console.error);
