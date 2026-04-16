/**
 * Classifies every object in objects_cache with continent + country.
 *
 * continent: africa | near-east | islamic | asia | europe | americas | oceania
 * country:   specific country or broad sub-region when country is ambiguous
 *
 * Run once (and re-run whenever the rules change):
 *   node scripts/classify-geography.mjs
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

// ─── Classification rules ─────────────────────────────────────────────────────
// Each rule: { match: fn(dept, culture) => bool, continent, country }
// Rules are checked in order; first match wins.

function contains(str, ...terms) {
  const s = str.toLowerCase();
  return terms.some((t) => s.includes(t.toLowerCase()));
}

// Word-boundary match — use for short terms that are substrings of unrelated words (e.g. "dan" in "danish")
function containsWord(str, ...terms) {
  return terms.some((t) => new RegExp(`\\b${t}\\b`, "i").test(str));
}

function classify(row) {
  const dept    = (row.department || "").toLowerCase();
  const culture = (row.culture    || "").toLowerCase();
  const inst    = (row.institution || "");

  // ── Africa ──────────────────────────────────────────────────────────────────
  // Egypt
  if (contains(dept, "egyptian") || contains(culture, "egyptian", "coptic", "nubian", "egypt"))
    return { continent: "africa", country: "Egypt" };

  // Ethiopia / Horn of Africa
  if (contains(culture, "ethiopian", "ethiopia", "amhara", "tigrinya", "aksumite"))
    return { continent: "africa", country: "Ethiopia" };

  // East Africa
  if (contains(culture, "swahili", "kenya", "tanzanian", "ugandan"))
    return { continent: "africa", country: "East Africa" };

  // West Africa – Nigeria
  if (contains(culture, "yoruba", "igbo", "ife", "edo peoples", "benin", "lower niger", "nok", "nupe", "owo", "bini"))
    return { continent: "africa", country: "Nigeria" };

  // West Africa – Ghana
  if (contains(culture, "akan", "asante", "ashanti", "fante", "ghana"))
    return { continent: "africa", country: "Ghana" };

  // West Africa – Mali / Niger
  if (contains(culture, "dogon", "bamana", "tellem", "middle niger", "mali", "malian", "djenné", "djenne"))
    return { continent: "africa", country: "Mali" };

  // West Africa – Côte d'Ivoire
  // Use containsWord for "dan" to avoid matching "danish", "scandinavian", etc.
  if ((contains(culture, "senufo", "baule", "baulé", "guro", "lobi", "baga") || containsWord(culture, "dan")) && !contains(culture, "sudan", "jordan", "andean"))
    return { continent: "africa", country: "Côte d'Ivoire" };

  // West Africa – Benin (country)
  // Use containsWord for "fon"/"ewe" to avoid matching "Fontainebleau", etc.
  if ((containsWord(culture, "fon", "ewe") || contains(culture, "fon-ewe")) && !contains(culture, "edo"))
    return { continent: "africa", country: "Benin" };

  // West Africa – Cameroon / Gabon
  if (contains(culture, "fang", "bamileke", "tikar", "kom", "gabon", "cameroon"))
    return { continent: "africa", country: "Cameroon / Gabon" };

  // West Africa – broad
  if (contains(culture, "nigerian", "ghanaian", "senegalese", "ivorian"))
    return { continent: "africa", country: "West Africa" };

  // Central Africa – DRC
  if (contains(culture, "kuba", "luba", "hemba", "songye", "pende", "chokwe", "tabwa", "lega", "yaka", "kongo", "teke", "mangbetu", "zande", "democratic republic of the congo"))
    return { continent: "africa", country: "DR Congo" };

  // Central Africa – Republic of Congo
  if (contains(culture, "republic of the congo", "loango"))
    return { continent: "africa", country: "Republic of Congo" };

  // Central Africa – Angola
  if (contains(culture, "angola"))
    return { continent: "africa", country: "Angola" };

  // North Africa / general
  if (contains(culture, "moroccan", "morocco", "tunisian", "algerian", "libyan"))
    return { continent: "africa", country: "North Africa" };

  // General African dept (AIC and others label by country)
  if (contains(dept, "africa") && !contains(dept, "africa, oceania") && !contains(culture, "maya","inca","aztec","moche","olmec","hawaiian","maori","polynesian"))
    return { continent: "africa", country: null };

  // AIC/MET Africa dept objects with culture = country name
  if (contains(dept, "africa") && (contains(culture, "nigeria") || contains(culture, "ghana") || contains(culture, "ethiopia") || contains(culture, "kenya") || contains(culture, "gabon") || contains(culture, "angola") || contains(culture, "congo")))
    return { continent: "africa", country: culture.trim().replace(/\b\w/g, (c) => c.toUpperCase()) };

  // ── Near East (pre-Islamic ancient cultures) ────────────────────────────────
  if (contains(dept, "near eastern", "ancient near east"))
    return { continent: "near-east", country: nearEastCountry(culture) };

  if (contains(culture, "sumerian", "akkadian", "babylonian", "assyrian", "mesopotamian", "neo-babylonian", "neo-assyrian", "ur iii", "kassite", "elamite"))
    return { continent: "near-east", country: "Iraq" };

  if (contains(culture, "achaemenid", "sasanian", "parthian", "median", "luristan", "persian") && !contains(dept, "islamic", "asian"))
    return { continent: "near-east", country: "Iran" };

  if (contains(culture, "hittite", "phrygian", "lydian", "urartian", "anatolian") && !contains(dept, "islamic", "european"))
    return { continent: "near-east", country: "Turkey" };

  if (contains(culture, "phoenician", "canaanite", "ugaritic"))
    return { continent: "near-east", country: "Levant" };

  if (contains(culture, "ancient israeli", "israelite", "judean", "hebrew"))
    return { continent: "near-east", country: "Israel / Palestine" };

  // ── Islamic World ───────────────────────────────────────────────────────────
  if (contains(dept, "islamic"))
    return { continent: "islamic", country: islamicCountry(culture) };

  if (contains(culture, "ottoman"))
    return { continent: "islamic", country: "Turkey" };

  if (contains(culture, "safavid", "qajar", "ilkhanid", "timurid") && !contains(culture, "mughal"))
    return { continent: "islamic", country: "Iran" };

  if (contains(culture, "mughal", "sultanate", "deccani"))
    return { continent: "islamic", country: "India" };

  if (contains(culture, "mamluk", "fatimid", "ayyubid"))
    return { continent: "islamic", country: "Egypt" };

  if (contains(culture, "umayyad", "abbasid") && !contains(dept, "near eastern"))
    return { continent: "islamic", country: "Islamic World" };

  // ── Asia – East Asia ────────────────────────────────────────────────────────
  // Specific culture names that don't contain "chinese"/"chinese"
  if (contains(culture, "liangzhu", "shang dynasty", "zhou dynasty", "han dynasty", "tang dynasty", "song dynasty", "yuan dynasty", "ming dynasty", "qing dynasty", "neolithic china"))
    return { continent: "asia", country: "China" };

  if (contains(culture, "chinese", "china") || (contains(dept, "asian") && contains(culture, "chinese", "china")))
    return { continent: "asia", country: "China" };

  if (contains(culture, "japanese", "japan") || (contains(dept, "asian") && contains(culture, "japanese", "japan", "edo period", "meiji", "jomon", "yayoi")))
    return { continent: "asia", country: "Japan" };

  if (contains(culture, "korean", "korea") || (contains(dept, "asian") && contains(culture, "korean", "korea", "joseon", "goryeo", "silla")))
    return { continent: "asia", country: "Korea" };

  // Asia – Southeast Asia
  if (contains(culture, "thai", "thailand", "siamese"))
    return { continent: "asia", country: "Thailand" };

  if (contains(culture, "cambodian", "cambodia", "khmer"))
    return { continent: "asia", country: "Cambodia" };

  if (contains(culture, "vietnamese", "vietnam", "champa", "cham"))
    return { continent: "asia", country: "Vietnam" };

  if (contains(culture, "indonesian", "javanese", "balinese", "indonesia"))
    return { continent: "asia", country: "Indonesia" };

  if (contains(culture, "burmese", "myanmar", "burma", "mon"))
    return { continent: "asia", country: "Myanmar" };

  if (contains(culture, "philippine", "filipino"))
    return { continent: "asia", country: "Philippines" };

  if (contains(culture, "malay", "malaysian"))
    return { continent: "asia", country: "Malaysia" };

  // Asia – South Asia
  if (contains(culture, "indian", "india", "south asian", "rajput", "gupta", "maurya", "chola", "pallava", "kushan", "gandharan", "gandhara"))
    return { continent: "asia", country: "India" };

  if (contains(culture, "nepali", "nepal", "nepalese"))
    return { continent: "asia", country: "Nepal" };

  if (contains(culture, "sri lankan", "sinhalese", "ceylonese"))
    return { continent: "asia", country: "Sri Lanka" };

  if (contains(culture, "tibetan", "tibet"))
    return { continent: "asia", country: "Tibet" };

  // Cleveland-specific named departments
  if (contains(dept, "korean art"))
    return { continent: "asia", country: "Korea" };

  if (contains(dept, "chinese art"))
    return { continent: "asia", country: "China" };

  if (contains(dept, "japanese art"))
    return { continent: "asia", country: "Japan" };

  if (contains(dept, "indian and southeast asian"))
    return { continent: "asia", country: null };

  // General Asian dept fallback
  if (contains(dept, "asian"))
    return { continent: "asia", country: null };

  // ── Europe ──────────────────────────────────────────────────────────────────
  if (contains(culture, "greek", "hellenistic", "minoan", "mycenaean", "cycladic"))
    return { continent: "europe", country: "Greece" };

  if (contains(culture, "roman", "etruscan", "italic") && !contains(culture, "romano-egyptian", "romano-british"))
    return { continent: "europe", country: "Italy" };

  if (contains(culture, "byzantine"))
    return { continent: "europe", country: "Byzantine Empire" };

  if (contains(culture, "french", "france"))
    return { continent: "europe", country: "France" };

  if (contains(culture, "dutch", "netherlandish", "flemish") && !contains(culture, "belgian"))
    return { continent: "europe", country: "Netherlands" };

  if (contains(culture, "flemish", "belgian", "south netherlandish"))
    return { continent: "europe", country: "Belgium" };

  if (contains(culture, "german", "germanic", "austro-german", "austrian", "bavarian", "rhenish"))
    return { continent: "europe", country: "Germany / Austria" };

  if (contains(culture, "italian", "florentine", "venetian", "milanese", "sienese", "roman school", "neapolitan", "bolognese", "lombard", "tuscan"))
    return { continent: "europe", country: "Italy" };

  if (contains(culture, "spanish", "castilian", "catalan"))
    return { continent: "europe", country: "Spain" };

  if (contains(culture, "british", "english", "scottish", "welsh", "irish"))
    return { continent: "europe", country: "United Kingdom" };

  if (contains(culture, "scandinavian", "danish", "swedish", "norwegian", "norse", "viking", "finnish"))
    return { continent: "europe", country: "Scandinavia" };

  if (contains(culture, "russian", "russia"))
    return { continent: "europe", country: "Russia" };

  if (contains(culture, "portuguese", "portuguese colonial"))
    return { continent: "europe", country: "Portugal" };

  if (contains(culture, "czech", "bohemian", "moravia"))
    return { continent: "europe", country: "Czech Republic" };

  if (contains(culture, "swiss", "switzerland"))
    return { continent: "europe", country: "Switzerland" };

  if (contains(culture, "polish", "poland"))
    return { continent: "europe", country: "Poland" };

  if (contains(culture, "hungarian", "hungary"))
    return { continent: "europe", country: "Hungary" };

  if (contains(culture, "greek and roman") || contains(dept, "greek and roman", "greek", "roman"))
    return { continent: "europe", country: null };

  if (contains(dept, "european", "medieval"))
    return { continent: "europe", country: null };

  // ── Americas ────────────────────────────────────────────────────────────────
  // Mesoamerica – Mexico
  if (contains(culture, "aztec", "mexica", "teotihuacan", "mixtec", "zapotec", "olmec", "veracruz", "nayarit", "colima", "huastec", "toltec", "mexican"))
    return { continent: "americas", country: "Mexico" };

  if (contains(culture, "maya", "mayan"))
    return { continent: "americas", country: "Mexico / Guatemala" };

  // South America – Peru
  if (contains(culture, "inca", "moche", "chimu", "chimú", "nasca", "nazca", "wari", "tiwanaku", "paracas", "chancay", "lambayeque", "recuay", "cupisnique", "peruvian"))
    return { continent: "americas", country: "Peru" };

  // South America – Colombia
  if (contains(culture, "muisca", "quimbaya", "calima", "tairona", "zenú", "zenu", "colombian", "tolita", "tumaco"))
    return { continent: "americas", country: "Colombia" };

  // Central America
  if (contains(culture, "costa rican", "guanacaste", "atlantic watershed", "diquís"))
    return { continent: "americas", country: "Costa Rica" };

  if (contains(culture, "panamanian", "veraguas", "coclé", "cocle", "conte"))
    return { continent: "americas", country: "Panama" };

  // Caribbean
  if (contains(culture, "taíno", "taino", "arawak", "caribbean"))
    return { continent: "americas", country: "Caribbean" };

  // Ecuador / Bolivia
  if (contains(culture, "valdivia", "chorrera", "ecuadorian"))
    return { continent: "americas", country: "Ecuador" };

  if (contains(culture, "bolivian", "tiwanaku") && !contains(culture, "peruvian"))
    return { continent: "americas", country: "Bolivia" };

  // North America – indigenous
  if (contains(culture, "native american", "pueblo", "hohokam", "mississippian", "northwest coast", "plains", "navajo", "hopi", "apache", "sioux", "iroquois", "cherokee", "anasazi"))
    return { continent: "americas", country: "United States" };

  if (contains(culture, "inuit", "arctic", "aleut"))
    return { continent: "americas", country: "Arctic" };

  // ── Oceania ─────────────────────────────────────────────────────────────────
  if (contains(culture, "hawaiian", "hawaii"))
    return { continent: "oceania", country: "Hawaii" };

  if (contains(culture, "maori", "new zealand"))
    return { continent: "oceania", country: "New Zealand" };

  if (contains(culture, "papua", "new guinea", "melanesian", "inyai", "abelam"))
    return { continent: "oceania", country: "Papua New Guinea" };

  if (contains(culture, "fijian", "fiji"))
    return { continent: "oceania", country: "Fiji" };

  if (contains(culture, "tongan", "tonga"))
    return { continent: "oceania", country: "Tonga" };

  if (contains(culture, "samoan", "samoa"))
    return { continent: "oceania", country: "Samoa" };

  if (contains(culture, "rapa nui", "easter island"))
    return { continent: "oceania", country: "Easter Island" };

  if (contains(culture, "polynesian", "micronesian", "oceanian", "solomon"))
    return { continent: "oceania", country: "Oceania" };

  if (contains(dept, "oceania") || contains(dept, "pacific"))
    return { continent: "oceania", country: null };

  // ── Smithsonian fallback (all Freer/Sackler objects are Asian art) ────────────
  // Use gallery/exhibition names in the department field to narrow the country
  if (inst === "smithsonian") {
    if (contains(dept, "korea", "korean")) return { continent: "asia", country: "Korea" };
    if (contains(dept, "china", "chinese")) return { continent: "asia", country: "China" };
    if (contains(dept, "japan", "japanese")) return { continent: "asia", country: "Japan" };
    if (contains(dept, "india", "indian", "south asia")) return { continent: "asia", country: "India" };
    if (contains(dept, "islamic", "iran", "persian")) return { continent: "islamic", country: null };
    return { continent: "asia", country: null };
  }

  return null; // unclassified
}

// ── Helper: pick country within Near East ─────────────────────────────────────
function nearEastCountry(culture) {
  if (contains(culture, "sumerian", "akkadian", "babylonian", "assyrian", "mesopotamian", "ur", "kassite", "elamite")) return "Iraq";
  if (contains(culture, "persian", "achaemenid", "sasanian", "parthian", "median", "luristan", "elamite")) return "Iran";
  if (contains(culture, "hittite", "phrygian", "lydian", "urartian", "anatolian")) return "Turkey";
  if (contains(culture, "phoenician", "canaanite")) return "Levant";
  if (contains(culture, "syrian")) return "Syria";
  if (contains(culture, "egyptian", "egypt")) return "Egypt";
  return "Ancient Near East";
}

// ── Helper: pick country within Islamic World ─────────────────────────────────
function islamicCountry(culture) {
  if (contains(culture, "ottoman", "turkish")) return "Turkey";
  if (contains(culture, "safavid", "qajar", "ilkhanid", "persian", "iranian", "timurid")) return "Iran";
  if (contains(culture, "mughal", "deccani", "sultanate")) return "India";
  if (contains(culture, "mamluk", "fatimid", "ayyubid", "egyptian")) return "Egypt";
  if (contains(culture, "moroccan", "morocc")) return "Morocco";
  if (contains(culture, "spanish", "hispano-moresque", "andalusian", "nasrid")) return "Spain";
  if (contains(culture, "central asian", "sogdian", "uzbek", "afghan")) return "Central Asia";
  if (contains(culture, "syrian", "umayyad")) return "Syria";
  if (contains(culture, "iraqi", "abbasid")) return "Iraq";
  return "Islamic World";
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const PAGE = 1000;
let total = 0;
let unclassified = 0;

console.log("Starting geographic classification…");

while (true) {
  // Always fetch from offset 0: processed objects leave the null-continent set,
  // so we never need to advance the offset.
  const { data, error } = await supabase
    .from("objects_cache")
    .select("id, department, culture, institution")
    .is("continent", null)
    .range(0, PAGE - 1);

  if (error) { console.error(error.message); break; }
  if (!data || data.length === 0) break;

  const updates = [];
  for (const row of data) {
    const result = classify(row);
    if (result) {
      updates.push({ id: row.id, continent: result.continent, country: result.country ?? null });
    } else {
      unclassified++;
      updates.push({ id: row.id, continent: "other", country: null });
    }
  }

  // Parallel updates in chunks of 50
  const CHUNK = 50;
  for (let i = 0; i < updates.length; i += CHUNK) {
    await Promise.all(
      updates.slice(i, i + CHUNK).map((u) =>
        supabase.from("objects_cache").update({ continent: u.continent, country: u.country }).eq("id", u.id)
      )
    );
  }

  total += data.length;
  process.stdout.write(`\r${total} classified, ${unclassified} unclassified…`);

  if (data.length < PAGE) break;
}

console.log(`\nDone. ${total} rows processed, ${unclassified} unclassified.`);
