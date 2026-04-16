/**
 * Check Korean object coverage in objects_cache.
 * Run: node scripts/check-korea-coverage.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  console.log("Checking Korean object coverage in objects_cache…\n");

  // Total with country = Korea
  const { count: totalClassified } = await supabase
    .from("objects_cache")
    .select("*", { count: "exact", head: true })
    .eq("country", "Korea");

  console.log(`Total classified as country="Korea": ${totalClassified ?? 0}`);

  // By institution
  const institutions = ["met", "aic", "rijks", "moma", "cleveland", "smithsonian", "getty", "princeton", "harvard", "brooklyn"];
  console.log("\nBy institution (country=Korea):");
  for (const inst of institutions) {
    const { count } = await supabase
      .from("objects_cache")
      .select("*", { count: "exact", head: true })
      .eq("country", "Korea")
      .eq("institution", inst);
    if (count) console.log(`  ${inst}: ${count}`);
  }

  // Also check unclassified Korean-culture objects (not yet classified by geography script)
  const { count: unclassified } = await supabase
    .from("objects_cache")
    .select("*", { count: "exact", head: true })
    .or("culture.ilike.%korean%,culture.ilike.%joseon%,culture.ilike.%goryeo%,culture.ilike.%koryo%,culture.ilike.%silla%")
    .is("country", null);

  console.log(`\nUnclassified objects with Korean culture terms: ${unclassified ?? 0}`);

  // Sample a few Korean objects to see what we have
  const { data: samples } = await supabase
    .from("objects_cache")
    .select("id, institution, title, culture, date")
    .eq("country", "Korea")
    .not("thumbnail_url", "is", null)
    .limit(10);

  if (samples?.length) {
    console.log("\nSample Korean objects:");
    for (const s of samples) {
      console.log(`  [${s.institution}] ${s.title} (${s.date || "no date"}) — ${s.culture}`);
    }
  }
}

main().catch(console.error);
