// patch-met-untitled.mjs
// Finds Met objects in the cache with title = 'Untitled' and fetches
// the real title (and any other missing fields) from the Met API.
//
// Run: node scripts/patch-met-untitled.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const MET_API     = "https://collectionapi.metmuseum.org/public/collection/v1/objects";
const REQUEST_DELAY = 1200;
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; museum-of-the-web/1.0; educational project)" };

async function fetchMetObject(objectId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${MET_API}/${objectId}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) {
        await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      return await res.json();
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

async function main() {
  // Fetch all untitled Met objects from cache
  const { data: rows, error } = await supabase
    .from("objects_cache")
    .select("id")
    .eq("institution", "met")
    .eq("title", "Untitled");

  if (error) { console.error("Supabase error:", error.message); process.exit(1); }
  if (!rows?.length) { console.log("No untitled Met objects found."); return; }

  console.log(`Found ${rows.length} untitled Met objects. Patching…\n`);

  let patched = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const cacheId   = rows[i].id;            // e.g. "met-548788"
    const objectId  = cacheId.replace("met-", "");

    const d = await fetchMetObject(objectId);

    if (!d || !d.title) {
      skipped++;
    } else {
      const updates = { title: d.title || "Untitled" };
      if (d.artistDisplayName) updates.artist_name = d.artistDisplayName;
      if (d.medium)            updates.medium       = d.medium;
      if (d.creditLine)        updates.credit_line  = d.creditLine;
      if (d.dimensions)        updates.dimensions   = d.dimensions;
      if (d.objectURL)         updates.object_url   = d.objectURL;

      const { error: updateErr } = await supabase
        .from("objects_cache")
        .update(updates)
        .eq("id", cacheId);

      if (updateErr) {
        console.error(`\nFailed to update ${cacheId}:`, updateErr.message);
      } else {
        patched++;
      }
    }

    process.stdout.write(`\r  ${i + 1}/${rows.length}  ·  patched ${patched}  ·  skipped ${skipped}`);
    await new Promise((r) => setTimeout(r, REQUEST_DELAY));
  }

  console.log(`\n\nDone. ${patched} patched, ${skipped} skipped (no title from API).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
