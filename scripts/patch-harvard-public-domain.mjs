/**
 * Patches is_public_domain for Harvard objects using imagepermissionlevel from Harvard API.
 * imagepermissionlevel = 0 → public domain
 * imagepermissionlevel = 1 → copyrighted
 *
 * Run: node scripts/patch-harvard-public-domain.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HAM_BASE = "https://api.harvardartmuseums.org";
const API_KEY  = "01a8df91-8bbe-430d-8cf4-191d3fd90e3f";
const BATCH    = 50;
const DELAY    = 300;

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  // Fetch all Harvard IDs from Supabase
  console.log("Fetching Harvard objects from Supabase...");
  const { data: rows } = await supabase
    .from("objects_cache")
    .select("id")
    .eq("institution", "harvard");

  const ids = rows.map((r) => r.id.replace("harvard-", ""));
  console.log(`  ${ids.length} objects to patch.`);

  let patched = 0, publicCount = 0;

  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const idList = chunk.join("|");

    const res = await fetch(
      `${HAM_BASE}/object?apikey=${API_KEY}&id=${idList}&fields=id,imagepermissionlevel&size=${BATCH}`
    );
    if (!res.ok) { console.warn(`  Batch ${i} failed: ${res.status}`); continue; }

    const data = await res.json();
    const records = data.records ?? [];

    for (const rec of records) {
      const isPublic = rec.imagepermissionlevel === 0;
      await supabase
        .from("objects_cache")
        .update({ is_public_domain: isPublic })
        .eq("id", `harvard-${rec.id}`);
      if (isPublic) publicCount++;
      patched++;
    }

    process.stdout.write(`\r  ${patched}/${ids.length} patched · ${publicCount} public domain`);
    await sleep(DELAY);
  }

  console.log(`\n\nDone. ${publicCount}/${patched} Harvard objects are public domain.`);
}

main().catch(console.error);
