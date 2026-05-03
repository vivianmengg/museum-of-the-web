/**
 * Generates the timeline cache JSON and uploads it to Supabase Storage.
 * Run this locally after any seed script:
 *   node scripts/generate-timeline-cache.mjs
 *
 * Requires a PUBLIC bucket called "timeline" in Supabase Storage.
 * Create it in: Supabase Dashboard → Storage → New bucket → name "timeline", Public ON
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

const COLS = "id,institution,title,date,culture,department,thumbnail_url,year_begin,year_end";

const CIVILIZATIONS = [
  { id: "africa",     deptMatch: ["Africa"],                                  cultureMatch: ["Yoruba","Fon","Benin","Ife","Igbo","Akan","Asante","Ashanti","Bamana","Dogon","Fang","Kongo","Luba","Kuba","Pende","Chokwe","Senufo","Baule","Mangbetu","Zande","Swahili","Amhara","Edo","Tellem","Tabwa","Hemba","Songye","Lega","Middle Niger","Lower Niger","Ethiopia","Nigeria","Ghana","Mali","Kenya","Gabon","Angola","Congo"] },
  { id: "egypt",      deptMatch: ["Egyptian", "Arts of Africa"],              cultureMatch: ["Egypt", "Egyptian"] },
  { id: "near-east",  deptMatch: ["Near Eastern", "West Asian"],              cultureMatch: null },
  { id: "cambodia",   deptMatch: ["Asian", "Arts of Asia"],                   cultureMatch: ["Cambodian", "Cambodia", "Khmer"] },
  { id: "china",      deptMatch: ["Asian", "Chinese Art", "Arts of Asia"],    cultureMatch: ["Chinese", "China"] },
  { id: "greece-rome",deptMatch: ["Greek", "Roman", "Getty Villa", "Greece, Rome", "Greece,"], cultureMatch: null },
  { id: "europe",     deptMatch: ["European", "Medieval", "Getty Center", "Europe"], cultureMatch: null },
  { id: "india",      deptMatch: ["Asian", "Arts of Asia", "Indian Art"],     cultureMatch: ["Indian", "India", "South Asian"] },
  { id: "indonesia",  deptMatch: ["Asian", "Arts of Asia"],                   cultureMatch: ["Indonesian", "Indonesia", "Javanese"] },
  { id: "islamic",    deptMatch: ["Islamic"],                                  cultureMatch: null },
  { id: "japan",      deptMatch: ["Asian", "Japanese Art", "Arts of Asia"],   cultureMatch: ["Japanese", "Japan"] },
  { id: "korea",      deptMatch: ["Asian", "Korean Art", "Arts of Asia"],     cultureMatch: ["Korean", "Korea"] },
  { id: "myanmar",    deptMatch: ["Asian", "Arts of Asia"],                   cultureMatch: ["Burmese", "Myanmar", "Burma"] },
  { id: "oceania",    deptMatch: ["Africa, Oceania"],                         cultureMatch: ["Hawaiian","Maori","Fijian","Tongan","Samoan","Papua","Melanesian","Polynesian","Micronesian","Oceanian","Papuan"] },
  { id: "thailand",   deptMatch: ["Asian", "Arts of Asia"],                   cultureMatch: ["Thai", "Thailand", "Siamese"] },
  { id: "americas",   deptMatch: ["Africa, Oceania", "Americas"],            cultureMatch: ["Maya","Mayan","Aztec","Inca","Olmec","Mixtec","Zapotec","Moche","Chimú","Chimu","Tiwanaku","Wari","Nazca","Teotihuacan","Mississippian","Hohokam","Pueblo","Native American","Mexican","Peruvian","Colombian","Costa Rican","Panamanian"] },
  { id: "vietnam",    deptMatch: ["Asian", "Arts of Asia"],                   cultureMatch: ["Vietnamese", "Vietnam", "Champa"] },
];

function matchesCiv(row, civ) {
  const dept    = (row.department || "").toLowerCase();
  const culture = (row.culture    || "").toLowerCase();
  const deptOk  = civ.deptMatch.some(d => dept.includes(d.toLowerCase()));
  if (!deptOk) return false;
  if (civ.cultureMatch) return civ.cultureMatch.some(c => culture.includes(c.toLowerCase()));
  return true;
}

// Try to extract a year from a date string like "18th century" or "c. 1750"
function parseYearFromString(dateStr) {
  if (!dateStr) return null;
  const centuryMatch = dateStr.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+century/i);
  if (centuryMatch) return (parseInt(centuryMatch[1]) - 1) * 100 + 50;
  const yearMatch = dateStr.match(/\b(1[0-9]{3}|[2-9][0-9]{2})\b/);
  if (yearMatch) return parseInt(yearMatch[1]);
  return null;
}

function assignYear(row) {
  const yb = row.year_begin, ye = row.year_end;

  // year_begin = 0 with no year_end is almost always bad seeding data (epoch default).
  // Try to recover the real year from the date string.
  if (yb === 0 && !ye) {
    const parsed = parseYearFromString(row.date);
    if (parsed && parsed > 50) return parsed;
    return null; // skip — undatable
  }

  const span = (ye ?? yb) - yb;
  if (yb < -3000) return yb;
  return span > 400 ? (ye ?? yb) : Math.round((yb + (ye ?? yb)) / 2);
}

async function fetchAll() {
  const allRows = [];
  let from = 0;
  const pageSize = 5000;

  while (true) {
    process.stdout.write(`\r  Fetching rows ${from}–${from + pageSize}...`);
    const { data, error } = await supabase
      .from("objects_cache")
      .select(COLS)
      .not("thumbnail_url", "is", null)
      .not("year_begin", "is", null)
      .neq("institution", "harvard")
      .neq("institution", "colbase")
      .gte("year_begin", -7000)
      .lte("year_begin", 2026)
      .order("year_begin")
      .range(from, from + pageSize - 1);

    if (error) { console.error("\nError:", error.message); break; }
    if (!data?.length) break;
    allRows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`\n  Fetched ${allRows.length.toLocaleString()} rows total.`);
  return allRows;
}

async function main() {
  console.log("Fetching all timeline objects from DB...");
  const rows = await fetchAll();

  console.log("Processing matchesCiv + year assignment...");
  const objects = [];
  for (const row of rows) {
    for (const civ of CIVILIZATIONS) {
      if (!matchesCiv(row, civ)) continue;
      const year = assignYear(row);
      if (year >= -7000 && year <= 2026) {
        objects.push({
          id:           row.id,
          institution:  row.institution,
          title:        row.title || "Untitled",
          date:         row.date  || "",
          culture:      row.culture || "",
          thumbnailUrl: row.thumbnail_url,
          civId:        civ.id,
          year,
        });
      }
      break;
    }
  }
  console.log(`  ${objects.length.toLocaleString()} timeline objects after matchesCiv.`);

  const json = JSON.stringify(objects);
  console.log(`  JSON size: ${(json.length / 1024 / 1024).toFixed(2)} MB`);

  console.log("Uploading to Supabase Storage (bucket: timeline)...");
  const { error } = await supabase.storage
    .from("timeline")
    .upload("data.json", Buffer.from(json), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    console.error("Upload failed:", error.message);
    console.error("Make sure you have a PUBLIC bucket called 'timeline' in Supabase Storage.");
    process.exit(1);
  }

  const publicUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/timeline/data.json`;
  console.log(`\nDone! Public URL:\n  ${publicUrl}`);
}

main().catch(e => { console.error(e); process.exit(1); });
