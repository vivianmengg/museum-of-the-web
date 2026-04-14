/**
 * Seed Princeton University Art Museum highlights into objects_cache.
 *
 * Uses two curated packages:
 *   - web_highlights revised 2021 (664 objects)
 *   - image_descriptions_top250 (306 objects)
 *
 * Run: node scripts/seed-princeton.mjs
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

const BASE = "https://data.artmuseum.princeton.edu";
const IIIF_BASE = "https://media.artmuseum.princeton.edu/iiif/3/collection";

// Curated package IDs
const PACKAGES = [
  197269, // web_highlights revised 2021 (664 objects)
  206417, // image_descriptions_top250 (306 objects)
];

const BATCH = 10;
const DELAY = 150;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchPackageIds(packageId) {
  const res = await fetch(`${BASE}/packages/${packageId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.objects ?? []).map((o) => o.id);
}

async function fetchObject(id) {
  const res = await fetch(`${BASE}/objects/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchImageDimensions(iiifId) {
  try {
    const res = await fetch(`${IIIF_BASE}/${iiifId}/info.json`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { image_width: 4, image_height: 3 };
    const info = await res.json();
    if (info.width && info.height) return { image_width: info.width, image_height: info.height };
  } catch { /* fall through */ }
  return { image_width: 4, image_height: 3 };
}

function parseObject(obj) {
  // Image — primaryimage is an array of IIIF base URLs like:
  // "https://media.artmuseum.princeton.edu/iiif/3/collection/y1975-17"
  // We extract the final path segment as the IIIF id.
  const primaryIiif = obj.primaryimage?.[0];
  if (!primaryIiif || obj.hasimage !== "true") return null;

  // Restrictions: skip if explicitly restricted
  // Note: nowebuse is the string "True"/"False", not a boolean
  if (obj.restrictions || obj.nowebuse === "True") return null;

  const iiifId = primaryIiif.replace(`${IIIF_BASE}/`, "").replace(/^.*\/collection\//, "");
  const imageUrl  = `${IIIF_BASE}/${iiifId}/full/full/0/default.jpg`;
  const thumbnailUrl = `${IIIF_BASE}/${iiifId}/full/!600,600/0/default.jpg`;

  const artistName = obj.displaymaker ?? obj.makers?.[0]?.displayname ?? "";
  const culture    = obj.displayculture ?? obj.cultures?.[0]?.culture ?? "";
  const medium     = obj.medium ?? "";
  const department = obj.department ?? "";

  return {
    iiifId,
    row: {
      id:            `princeton-${obj.objectid}`,
      institution:   "princeton",
      title:         obj.displaytitle || "Untitled",
      date:          obj.displaydate || "",
      culture,
      medium,
      image_url:     imageUrl,
      thumbnail_url: thumbnailUrl,
      image_width:   4,
      image_height:  3,
      department,
      artist_name:   artistName,
      credit_line:   obj.creditline || "",
      dimensions:    obj.dimensions || "",
      object_url:    `https://artmuseum.princeton.edu/collections/objects/${obj.objectid}`,
      year_begin:    obj.datebegin || null,
      year_end:      obj.dateend   || null,
      cached_at:     new Date().toISOString(),
    },
  };
}

async function main() {
  console.log("Seeding Princeton University Art Museum highlights…\n");

  // Collect unique object IDs across all packages
  const idSet = new Set();
  for (const pkgId of PACKAGES) {
    const ids = await fetchPackageIds(pkgId);
    ids.forEach((id) => idSet.add(id));
    console.log(`Package ${pkgId}: ${ids.length} objects (${idSet.size} unique so far)`);
  }
  const ids = [...idSet];
  console.log(`\nTotal unique objects: ${ids.length}`);

  // Check which are already cached
  const cached = new Set();
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500).map((id) => `princeton-${id}`);
    const { data } = await supabase.from("objects_cache").select("id").in("id", chunk);
    (data ?? []).forEach((r) => cached.add(r.id));
  }
  const toFetch = ids.filter((id) => !cached.has(`princeton-${id}`));
  console.log(`${cached.size} already cached, ${toFetch.length} to fetch.\n`);

  let inserted = 0, skipped = 0, noImage = 0;

  for (let i = 0; i < toFetch.length; i += BATCH) {
    const batch = toFetch.slice(i, i + BATCH);

    const parsed = await Promise.all(
      batch.map(async (id) => {
        try {
          const obj = await fetchObject(id);
          if (!obj) return null;
          return parseObject(obj);
        } catch { return null; }
      })
    );

    // Fetch image dimensions in parallel for this batch
    const withDims = await Promise.all(
      parsed.map(async (p) => {
        if (!p) return null;
        const dims = await fetchImageDimensions(p.iiifId);
        return { ...p, row: { ...p.row, ...dims } };
      })
    );

    for (const p of withDims) {
      if (!p) { skipped++; continue; }
      if (!p.row.thumbnail_url) { noImage++; continue; }

      const { error } = await supabase
        .from("objects_cache")
        .upsert(p.row, { onConflict: "id" });

      if (error) {
        console.error(`\n✗ ${p.row.id}: ${error.message}`);
        skipped++;
      } else {
        inserted++;
      }
    }

    process.stdout.write(
      `  ${i + batch.length}/${toFetch.length} · ${inserted} inserted · ${skipped} errors · ${noImage} no image\r`
    );
    await sleep(DELAY);
  }

  console.log(`\n\nDone. ${inserted} inserted, ${skipped} errors, ${noImage} skipped (no image).`);
}

main().catch(console.error);
