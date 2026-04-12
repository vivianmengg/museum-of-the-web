// patch-dimensions-all.mjs
// Backfills image_width/image_height for all institutions with default 4x3.
// - IIIF URLs (AIC): fetches info.json (no image download)
// - All others (Met, Harvard, ColBase, Smithsonian, Cleveland): probes via HTTP
//
// Run: node scripts/patch-dimensions-all.mjs [institution]
//   e.g. node scripts/patch-dimensions-all.mjs aic
//   or   node scripts/patch-dimensions-all.mjs met
//   or   node scripts/patch-dimensions-all.mjs   (all institutions)

import { createClient } from "@supabase/supabase-js";
import probe from "probe-image-size";
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

const CONCURRENCY = 12;
const DELAY_MS = 100;

async function getDimensions(thumbnailUrl) {
  try {
    const result = await probe(thumbnailUrl, { timeout: 8000 });
    return result ? { w: result.width, h: result.height } : null;
  } catch {
    return null;
  }
}

// AIC: Cloudflare blocks direct image/IIIF requests from servers.
// Instead, batch-fetch dimensions from the AIC API (returns thumbnail.width/height).
async function patchAic() {
  console.log("\n── aic ──");
  const { data: rows } = await supabase
    .from("objects_cache")
    .select("id")
    .eq("institution", "aic")
    .eq("image_width", 4)
    .eq("image_height", 3)
    .limit(10000);

  if (!rows?.length) { console.log("  Nothing to patch."); return; }
  console.log(`  ${rows.length} objects to patch…`);

  const numericIds = rows.map((r) => r.id.replace("aic-", ""));
  let updated = 0, failed = 0;
  const AIC_BATCH = 100;

  for (let i = 0; i < numericIds.length; i += AIC_BATCH) {
    const chunk = numericIds.slice(i, i + AIC_BATCH);
    try {
      const url = `https://api.artic.edu/api/v1/artworks?ids=${chunk.join(",")}&fields=id,thumbnail&limit=${AIC_BATCH}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) { failed += chunk.length; continue; }
      const { data } = await res.json();
      await Promise.all((data ?? []).map(async (item) => {
        const w = item.thumbnail?.width;
        const h = item.thumbnail?.height;
        if (!w || !h) { failed++; return; }
        const { error } = await supabase.from("objects_cache")
          .update({ image_width: w, image_height: h })
          .eq("id", `aic-${item.id}`);
        if (error) failed++; else updated++;
      }));
    } catch {
      failed += chunk.length;
    }
    process.stdout.write(`  ${Math.min(i + AIC_BATCH, numericIds.length)}/${numericIds.length} · ${updated} updated · ${failed} failed\r`);
    await sleep(200);
  }
  console.log(`  Done: ${updated} updated, ${failed} failed.            `);
}

async function patchInstitution(inst) {
  if (inst === "aic") return patchAic();

  console.log(`\n── ${inst} ──`);
  const { data: rows } = await supabase
    .from("objects_cache")
    .select("id, thumbnail_url")
    .eq("institution", inst)
    .eq("image_width", 4)
    .eq("image_height", 3)
    .not("thumbnail_url", "is", null)
    .limit(10000);

  if (!rows?.length) { console.log("  Nothing to patch."); return; }
  console.log(`  ${rows.length} objects to patch…`);

  let updated = 0, failed = 0;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (row) => {
      const dims = await getDimensions(row.thumbnail_url);
      if (!dims) { failed++; return; }
      const { error } = await supabase
        .from("objects_cache")
        .update({ image_width: dims.w, image_height: dims.h })
        .eq("id", row.id);
      if (error) failed++;
      else updated++;
    }));
    process.stdout.write(`  ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length} · ${updated} updated · ${failed} failed\r`);
    await sleep(DELAY_MS);
  }
  console.log(`  Done: ${updated} updated, ${failed} failed.            `);
}

async function main() {
  const target = process.argv[2];
  const institutions = target
    ? [target]
    : ["aic", "colbase", "smithsonian", "cleveland", "harvard", "met"];

  for (const inst of institutions) {
    await patchInstitution(inst);
  }
  console.log("\nAll done.");
}

main().catch(console.error);
