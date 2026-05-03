/**
 * Patches Smithsonian objects where department = "Google Arts & Culture"
 * by deriving a proper department from the culture field.
 *
 * Run: node scripts/patch-smithsonian-department.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n").filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function deriveDepartment(culture = "", title = "") {
  const c = culture.toLowerCase();
  const t = title.toLowerCase();
  if (c.includes("chinese") || c.includes("china") || c.includes("liangzhu") ||
      c.includes("yangshao") || c.includes("longshan") || c.includes("majiayao") ||
      c.includes("banshan") || c.includes("shang") || c.includes("zhou") ||
      c.includes("han") || c.includes("tang") || c.includes("song") ||
      c.includes("ming") || c.includes("qing")) return "Chinese Art";
  if (c.includes("japanese") || c.includes("japan")) return "Japanese Art";
  if (c.includes("korean") || c.includes("korea")) return "Korean Art";
  if (c.includes("indian") || c.includes("india") || c.includes("gandhara") ||
      c.includes("mughal") || c.includes("rajput")) return "Indian and Southeast Asian Art";
  if (c.includes("thai") || c.includes("cambodia") || c.includes("khmer") ||
      c.includes("vietnamese") || c.includes("javanese")) return "Indian and Southeast Asian Art";
  if (c.includes("islamic") || c.includes("persian") || c.includes("ottoman") ||
      c.includes("safavid") || c.includes("arab")) return "Islamic Art";
  if (c.includes("egyptian") || c.includes("egypt")) return "Egyptian Art";
  if (c.includes("greek") || c.includes("roman") || c.includes("byzantine")) return "Greek and Roman Art";
  if (c.includes("african") || c.includes("yoruba") || c.includes("benin")) return "Arts of Africa";
  // Default: if we can't tell, use Asian Art as fallback for Smithsonian (Freer/Sackler)
  return "Asian Art";
}

async function main() {
  const { data, error } = await supabase
    .from("objects_cache")
    .select("id, culture, title, department")
    .eq("institution", "smithsonian")
    .eq("department", "Google Arts & Culture");

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`Found ${data.length} Smithsonian objects with bad department.`);

  let updated = 0;
  for (const r of data) {
    const department = deriveDepartment(r.culture, r.title);
    const { error: err } = await supabase
      .from("objects_cache")
      .update({ department })
      .eq("id", r.id);

    if (err) { console.error("Error:", err.message); continue; }
    updated++;
    if (updated % 50 === 0) process.stdout.write(`\r  Updated ${updated}/${data.length}`);
  }

  console.log(`\nDone. ${updated} objects patched.`);
  console.log("Run generate-timeline-cache.mjs to refresh the timeline.");
}

main().catch(e => { console.error(e); process.exit(1); });
