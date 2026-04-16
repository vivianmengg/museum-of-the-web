/**
 * Broad coverage audit of objects_cache.
 * Shows counts by institution, continent, and top countries.
 * Run: node scripts/check-coverage.mjs
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

async function count(filters = {}) {
  let q = supabase.from("objects_cache").select("*", { count: "exact", head: true }).not("thumbnail_url", "is", null);
  for (const [k, v] of Object.entries(filters)) {
    if (v === null) q = q.is(k, null);
    else q = q.eq(k, v);
  }
  const { count: n } = await q;
  return n ?? 0;
}

async function main() {
  const total = await count();
  console.log(`\nTotal objects with images: ${total.toLocaleString()}\n`);

  // ── By institution ──────────────────────────────────────────────────────────
  const institutions = ["met", "aic", "rijks", "moma", "cleveland", "smithsonian", "getty", "princeton", "harvard", "brooklyn", "colbase"];
  console.log("By institution:");
  for (const inst of institutions) {
    const n = await count({ institution: inst });
    if (n) console.log(`  ${inst.padEnd(12)} ${n.toLocaleString()}`);
  }

  // ── By continent ────────────────────────────────────────────────────────────
  const continents = ["asia", "europe", "africa", "near-east", "islamic", "americas", "oceania"];
  console.log("\nBy continent:");
  for (const c of continents) {
    const n = await count({ continent: c });
    console.log(`  ${c.padEnd(12)} ${n.toLocaleString()}`);
  }
  const unclassified = await count({ continent: "other" });
  const nullContinent = await count();
  console.log(`  other        ${unclassified.toLocaleString()}`);

  // ── Top countries ────────────────────────────────────────────────────────────
  const countries = [
    "China", "Japan", "Korea", "India", "Egypt", "Greece", "Italy",
    "France", "Netherlands", "United Kingdom", "Germany / Austria",
    "Iran", "Iraq", "Turkey", "Nigeria", "Mexico", "Peru",
  ];
  console.log("\nKey countries:");
  for (const c of countries) {
    const n = await count({ country: c });
    console.log(`  ${c.padEnd(20)} ${n.toLocaleString()}`);
  }

  // ── Seeded institutions only (what free browse actually uses) ───────────────
  console.log("\nSeeded institutions (used in free browse): cleveland, smithsonian, getty, princeton");
  const seededInstitutions = ["cleveland", "smithsonian", "getty", "princeton"];
  for (const inst of seededInstitutions) {
    console.log(`\n  ${inst}:`);
    for (const c of continents) {
      const n = await count({ institution: inst, continent: c });
      if (n) console.log(`    ${c.padEnd(12)} ${n}`);
    }
  }
}

main().catch(console.error);
