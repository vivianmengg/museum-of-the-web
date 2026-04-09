// seed-getty-on-view.mjs
// Seeds Getty Museum on-view objects using Linked Art API.
// Uses SPARQL to find ~2,074 on-view objects, then fetches each via REST.
//
// Run: node scripts/seed-getty-on-view.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPARQL_ENDPOINT = "https://data.getty.edu/museum/collection/sparql";
const OBJECT_BASE = "https://data.getty.edu/museum/collection/object";
// Storage location URI — objects here are not on view
const STORAGE_URI = "https://data.getty.edu/museum/collection/place/a03fec3c-c7a2-4b29-9995-5eddf3ceb0a4";
const BATCH_SIZE = 10;
const REQUEST_DELAY = 200;

const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function sparqlQuery(sparql) {
  const res = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/sparql-results+json",
    },
    body: `query=${encodeURIComponent(sparql)}`,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SPARQL ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function getAllOnViewIds() {
  console.log("Fetching on-view object IDs via SPARQL…");
  const ids = [];
  let offset = 0;
  const pageSize = 200;

  while (true) {
    const sparql = `
      PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
      PREFIX la: <https://linked.art/ns/terms/>

      SELECT ?object WHERE {
        ?object a crm:E22_Human-Made_Object ;
                crm:P55_has_current_location ?loc .
        FILTER(?loc != <${STORAGE_URI}>)
        FILTER(STRSTARTS(STR(?object), "https://data.getty.edu/museum/collection/object/"))
      }
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    let result;
    try {
      result = await sparqlQuery(sparql);
    } catch (e) {
      console.error(`SPARQL error at offset ${offset}: ${e.message}`);
      break;
    }

    const bindings = result.results?.bindings ?? [];
    if (bindings.length === 0) break;

    for (const b of bindings) {
      const uri = b.object?.value;
      if (uri) {
        const uuid = uri.replace("https://data.getty.edu/museum/collection/object/", "");
        ids.push(uuid);
      }
    }

    console.log(`  …fetched ${ids.length} IDs so far (offset ${offset})`);
    if (bindings.length < pageSize) break;
    offset += pageSize;
    await sleep(500);
  }

  return ids;
}

function parseISOYear(isoStr) {
  if (!isoStr) return null;
  // ISO format: "1889-01-01T00:00:00" or "-0540-01-01T00:00:00" or "-3000-01-01T00:00:00"
  const m = isoStr.match(/^(-?\d+)-/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  // ISO uses proleptic Gregorian; year 0 = 1 BCE, -540 = 541 BCE
  // For our purposes year 0 is fine as-is
  return y;
}

function findReferredTo(arr, label) {
  if (!arr) return null;
  const entry = arr.find((r) => r._label === label);
  return entry?.content ?? null;
}

function extractThumbnail(imageUrl) {
  if (!imageUrl) return null;
  // Getty representation URLs already end with /full/full/0/default.jpg
  // Strip that suffix to get the IIIF base, then append the thumbnail size
  const base = imageUrl.replace(/\/full\/full\/0\/default\.jpg$/, "");
  if (base !== imageUrl) return `${base}/full/!300,300/0/default.jpg`;
  // Fallback: bare IIIF base URL
  if (imageUrl.includes("/iiif/")) return `${imageUrl}/full/!300,300/0/default.jpg`;
  return imageUrl;
}

async function fetchObject(uuid) {
  const url = `${OBJECT_BASE}/${uuid}`;
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) return null;
  const obj = await res.json();
  return obj;
}

function parseObject(uuid, obj) {
  const title = obj._label || "Untitled";

  // Artist
  const artistName = obj.produced_by?.carried_out_by?.[0]?._label ?? "";

  // Dates
  const timespan = obj.produced_by?.timespan;
  const yearBegin = parseISOYear(timespan?.begin_of_the_begin);
  const yearEnd = parseISOYear(timespan?.end_of_the_end);
  const dateLabel = timespan?._label ?? "";

  // Image
  const imageUrl = obj.representation?.[0]?.id ?? null;
  const thumbnailUrl = extractThumbnail(imageUrl);
  if (!thumbnailUrl) return null; // skip objects without images

  // Metadata from referred_to_by
  const refs = obj.referred_to_by;
  const medium = findReferredTo(refs, "Materials Description") ?? "";
  const creditLine = findReferredTo(refs, "Source Credit Line") ?? "";
  const dimensions = findReferredTo(refs, "Dimensions Statement") ?? "";

  // Department from classified_as
  let department = "";
  if (obj.classified_as) {
    for (const c of obj.classified_as) {
      if (c._label && c.classified_as?.some((cc) => cc._label === "Department")) {
        department = c._label;
        break;
      }
    }
  }

  // Culture / nationality from about or style classification
  let culture = "";
  if (obj.about) {
    for (const a of obj.about) {
      if (a.type === "Place" && a._label) { culture = a._label; break; }
    }
  }

  // Object URL
  const objectUrl = obj.subject_of?.find((s) => s._label?.startsWith("Homepage"))?.id ?? null;

  // Location (gallery)
  const location = obj.current_location?._label ?? "";

  return {
    id: `getty-${uuid}`,
    institution: "getty",
    title,
    date: dateLabel,
    culture,
    medium,
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    image_width: 4,
    image_height: 3,
    department: department || location,
    artist_name: artistName,
    credit_line: creditLine,
    dimensions,
    object_url: objectUrl,
    year_begin: yearBegin,
    year_end: yearEnd,
    cached_at: new Date().toISOString(),
  };
}

async function main() {
  console.log("Seeding Getty Museum on-view objects…\n");

  const ids = await getAllOnViewIds();
  console.log(`\nTotal on-view IDs: ${ids.length}\n`);

  if (ids.length === 0) {
    console.log("No IDs found. Check SPARQL query.");
    return;
  }

  // Check which are already cached
  const allCachedIds = new Set();
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500).map((id) => `getty-${id}`);
    const { data } = await supabase.from("objects_cache").select("id").in("id", chunk);
    (data ?? []).forEach((r) => allCachedIds.add(r.id));
  }

  const toFetch = ids.filter((id) => !allCachedIds.has(`getty-${id}`));
  console.log(`${allCachedIds.size} already cached, ${toFetch.length} to fetch.\n`);

  let inserted = 0, skipped = 0, noImage = 0;

  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (uuid) => {
        try {
          const obj = await fetchObject(uuid);
          if (!obj) return null;
          return parseObject(uuid, obj);
        } catch {
          return null;
        }
      })
    );

    for (const row of results) {
      if (!row) { skipped++; continue; }
      if (!row.thumbnail_url) { noImage++; continue; }

      const { error } = await supabase.from("objects_cache").upsert(row, { onConflict: "id" });
      if (error) {
        console.error(`\n✗ ${row.id}: ${error.message}`);
        skipped++;
      } else {
        inserted++;
      }
    }

    const total = i + batch.length;
    process.stdout.write(
      `  ${total}/${toFetch.length} fetched · ${inserted} inserted · ${skipped} errors · ${noImage} no image\r`
    );

    await sleep(REQUEST_DELAY);
  }

  console.log(`\n\nDone. ${inserted} inserted, ${skipped} errors, ${noImage} skipped (no image).`);
}

main().catch(console.error);
