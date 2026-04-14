/**
 * Classifies every object in objects_cache with a material label.
 *
 * material: one of the MEDIUMS ids (photography | painting | works-on-paper |
 *           printmaking | ceramics | glass | bronze | metalwork | silk | wood | stone | jade)
 *
 * Run once (and re-run whenever rules change):
 *   node scripts/classify-material.mjs
 */

import { createClient } from "@supabase/supabase-js";
import pg from "pg";
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

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function contains(str, ...terms) {
  const s = str.toLowerCase();
  return terms.some((t) => s.includes(t.toLowerCase()));
}

// Rules checked in order — first match wins.
// More specific terms must come before general ones (e.g. "bronze" before bare "metal").
function classifyMaterial(medium) {
  const m = (medium || "").toLowerCase();

  // Photography (most distinctive — check first)
  if (contains(m, "gelatin silver", "photograph", "daguerreotype", "chromogenic", "albumen", "cyanotype", "tintype", "ambrotype", "photogravure", "heliogravure", "palladium print", "platinum print", "calotype"))
    return "photography";

  // Posters (before prints — many posters are lithographs)
  if (contains(m, "poster", "broadside"))
    return "posters";

  // Jade (before stone — jade is a mineral but curators treat it separately)
  if (contains(m, "jade", "nephrite", "jadeite"))
    return "jade";

  // Bronze & Copper (base metals — casting, alloys)
  if (contains(m, "bronze", "copper", "brass", "copper alloy"))
    return "bronze";

  // Gold & Silver (precious metals — goldsmithing, silversmithing)
  if (contains(m, "gold", "silver", "gilt", "repoussé", "repousse", "niello", "filigree", "granulation", "enamel on metal", "cloisonné", "champlevé"))
    return "metalwork";

  // Glass
  if (contains(m, "glass", "mosaic glass", "millefiori"))
    return "glass";

  // Ceramics
  if (contains(m, "porcelain", "earthenware", "stoneware", "faience", "terracotta", "terra cotta", "ceramic", "pottery", "majolica", "maiolica", "tin-glazed", "celadon", "sancai", "delftware", "creamware", "pearlware"))
    return "ceramics";

  // Silk & Textile
  if (contains(m, "silk", "embroidery", "tapestry", "brocade", "velvet", "linen", "cotton", "wool", "woven", "weaving", "textile", "needlework", "carpet", "rug", "lace", "damask", "satin", "taffeta", "batik", "ikat"))
    return "silk";

  // Wood & Lacquer
  if (contains(m, "lacquer", "lacquerware", "boxwood", "oak", "walnut", "cedar", "mahogany", "ebony", "ivory", "carved wood", "wood"))
    return "wood";

  // Stone & Marble
  if (contains(m, "marble", "limestone", "sandstone", "alabaster", "granite", "basalt", "porphyry", "schist", "quartzite", "obsidian", "serpentine", "steatite", "stone", "rock crystal"))
    return "stone";

  // Painting (before drawing — "oil on" is unambiguous)
  if (contains(m, "oil on canvas", "oil on panel", "oil on copper", "oil on board", "tempera", "fresco", "encaustic", "acrylic on canvas", "acrylic on panel", "egg tempera", "casein"))
    return "painting";

  // Prints (multiples from a matrix)
  if (contains(m, "etching", "woodblock", "lithograph", "woodcut", "engraving", "aquatint", "mezzotint", "screenprint", "silkscreen", "linocut", "drypoint", "monotype", "intaglio"))
    return "prints";

  // Drawing (unique works on paper)
  if (contains(m, "watercolor", "gouache", "pastel", "chalk", "charcoal", "ink on paper", "brush and ink", "pen and ink", "colored pencil", "graphite", "pencil"))
    return "drawing";

  return null; // unclassified
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const PAGE = 1000;
let offset = 0;
let total = 0;
let unclassified = 0;

console.log("Starting material classification…");

while (true) {
  const { data, error } = await supabase
    .from("objects_cache")
    .select("id, medium")
    .range(offset, offset + PAGE - 1);

  if (error) { console.error(error.message); break; }
  if (!data || data.length === 0) break;

  const updates = data.map((row) => {
    const material = classifyMaterial(row.medium);
    if (!material) unclassified++;
    return { id: row.id, material: material ?? null };
  });

  // Single batch UPDATE via raw SQL — one round trip per 1000 rows
  const values = updates.map((u, i) => `($${i * 2 + 1}, $${i * 2 + 2}::text)`).join(", ");
  const params = updates.flatMap((u) => [u.id, u.material]);
  await pool.query(
    `UPDATE objects_cache SET material = v.material
     FROM (VALUES ${values}) AS v(id, material)
     WHERE objects_cache.id = v.id`,
    params
  );

  total += data.length;
  process.stdout.write(`\r${total} processed, ${unclassified} unclassified…`);

  if (data.length < PAGE) break;
  offset += PAGE;
}

await pool.end();
console.log(`\nDone. ${total} rows processed, ${unclassified} unclassified.`);
