// seed-moma.mjs
// Downloads MoMA's public collection dataset and upserts artworks with images
// into the objects_cache Supabase table.
//
// Run: node scripts/seed-moma.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DATA_URL =
  "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artworks.json";

const BATCH_SIZE = 500;

function toRow(art) {
  // Parse cm dimensions from the Dimensions string — more reliable than the
  // structured fields which are sometimes wrong (e.g. Width: 4 instead of 64.1).
  // Format is typically "... (H × W cm)" — height first, then width.
  let imageWidth = 1, imageHeight = 1; // default: square

  const dimStr = art["Dimensions"] || "";
  const cmMatch = dimStr.match(/\((\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*cm\)/);
  if (cmMatch) {
    const h = parseFloat(cmMatch[1]);
    const w = parseFloat(cmMatch[2]);
    if (h > 0 && w > 0) {
      // Clamp ratio to 1:4 – 4:1
      const ratio = Math.min(4, Math.max(0.25, h / w));
      imageWidth = 100;
      imageHeight = Math.round(ratio * 100);
    }
  } else {
    // Fall back to structured fields when Dimensions string has no cm pair
    const w = parseFloat(art["Width (cm)"]) || parseFloat(art["Diameter (cm)"]) || 0;
    const h = parseFloat(art["Height (cm)"]) || 0;
    if (w > 0 && h > 0) {
      const ratio = Math.min(4, Math.max(0.25, h / w));
      imageWidth = 100;
      imageHeight = Math.round(ratio * 100);
    }
  }

  const artist = Array.isArray(art.Artist) ? art.Artist.join(", ") : (art.Artist || "");

  return {
    id: `moma-${art.ObjectID}`,
    institution: "moma",
    title: art.Title || "Untitled",
    date: art.Date || "",
    culture: (Array.isArray(art.Nationality) ? art.Nationality[0] : art.Nationality) || "",
    medium: art.Medium || "",
    image_url: art.ImageURL || null,
    thumbnail_url: art.ImageURL || null,
    image_width: imageWidth,
    image_height: imageHeight,
    department: art.Department || "",
    artist_name: artist,
    credit_line: art.CreditLine || "",
    dimensions: art.Dimensions || "",
    object_url: art.URL || null,
    cached_at: new Date().toISOString(),
  };
}

async function main() {
  console.log("Downloading MoMA collection data (~140 MB)…");
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Failed to download: ${res.status}`);

  console.log("Parsing JSON…");
  const artworks = await res.json();
  console.log(`Total artworks: ${artworks.length.toLocaleString()}`);

  // Filter: must have ImageURL and at least one dimension
  const withImages = artworks.filter(
    (a) => a.ImageURL && (parseFloat(a["Width (cm)"]) > 0 || parseFloat(a["Height (cm)"]) > 0)
  );
  console.log(`With images + dimensions: ${withImages.length.toLocaleString()}`);

  const rows = withImages.map(toRow);

  // Upsert in batches
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("objects_cache")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`Batch ${i}–${i + BATCH_SIZE} failed:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Inserted ${inserted.toLocaleString()} / ${rows.length.toLocaleString()}`);
    }
  }

  console.log(`\nDone. ${inserted.toLocaleString()} MoMA objects in cache.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
