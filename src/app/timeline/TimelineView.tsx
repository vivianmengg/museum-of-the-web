"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { Civilization, TimelineObject } from "./page";

interface Props {
  objects: TimelineObject[];
  civilizations: Civilization[];
}

const START = -7000;
const END   = 2026;
const RANGE = END - START;

function formatYear(y: number): string {
  const abs = Math.abs(Math.round(y));
  if (y < 0)  return `${abs} BCE`;
  if (y === 0) return "0";
  return `${abs} CE`;
}

type EraRange = { start: number; end: number; label: string; context?: string };

const CIV_ERAS: Record<string, EraRange[]> = {
  "egypt": [
    { start: -3100, end: -2686, label: "Early Dynastic" },
    { start: -2686, end: -2181, label: "Old Kingdom" },
    { start: -2181, end: -2055, label: "First Intermediate" },
    { start: -2055, end: -1650, label: "Middle Kingdom" },
    { start: -1650, end: -1550, label: "Second Intermediate" },
    { start: -1550, end: -1069, label: "New Kingdom" },
    { start: -1069, end:  -664, label: "Third Intermediate" },
    { start:  -664, end:  -332, label: "Late Period" },
    { start:  -332, end:   -30, label: "Ptolemaic Period" },
    { start:   -30, end:   641, label: "Roman Egypt" },
    { start:   641, end:  1798, label: "Islamic Egypt" },
    { start:  1798, end:  1952, label: "Colonial & Khedivate" },
    { start:  1952, end:  2026, label: "Modern Egypt" },
  ],
  "near-east": [
    { start: -3500, end: -2334, label: "Sumerian" },
    { start: -2334, end: -2154, label: "Akkadian Empire" },
    { start: -2112, end: -1800, label: "Third Dynasty of Ur" },
    { start: -1900, end: -1600, label: "Old Babylonian" },
    { start: -1600, end:  -912, label: "Kassite / Middle Assyrian" },
    { start:  -911, end:  -609, label: "Neo-Assyrian Empire" },
    { start:  -626, end:  -539, label: "Neo-Babylonian" },
    { start:  -539, end:  -330, label: "Achaemenid Persia" },
    { start:  -330, end:   224, label: "Hellenistic / Parthian" },
    { start:   224, end:   651, label: "Sasanian Empire" },
    { start:   651, end:  1900, label: "Islamic Period" },
    { start:  1900, end:  2026, label: "Modern Period" },
  ],
  "greece-rome": [
    { start: -3000, end: -1100, label: "Bronze Age / Mycenaean" },
    { start: -1100, end:  -800, label: "Greek Dark Ages" },
    { start:  -800, end:  -500, label: "Archaic Greece" },
    { start:  -500, end:  -323, label: "Classical Greece" },
    { start:  -323, end:   -27, label: "Hellenistic Period" },
    { start:   -27, end:   284, label: "Roman Empire" },
    { start:   284, end:   476, label: "Late Roman Empire" },
    { start:   476, end:  1453, label: "Byzantine Empire" },
    { start:  1453, end:  2026, label: "Modern Greece & Balkans" },
  ],
  "china": [
    { start: -2100, end: -1600, label: "Xia Dynasty" },
    { start: -1600, end: -1046, label: "Shang Dynasty" },
    { start: -1046, end:  -256, label: "Zhou Dynasty" },
    { start:  -221, end:  -206, label: "Qin Dynasty" },
    { start:  -206, end:   220, label: "Han Dynasty" },
    { start:   220, end:   581, label: "Six Dynasties" },
    { start:   581, end:   618, label: "Sui Dynasty" },
    { start:   618, end:   907, label: "Tang Dynasty", context: "The Tang dynasty was one of the most cosmopolitan periods in Chinese history. The Silk Road brought merchants, monks, and artists from Persia, Central Asia, and the Islamic world into Chang'an, then the largest city on earth. This openness shows in the art: sancai (three-color lead glazes in amber, green, and cream) decorated tomb figures of Central Asian musicians and Bactrian camels. Potters absorbed foreign forms — flasks, ewers, and rhytons — while Buddhist monasteries, flush with imperial patronage, filled with gilded bronze sculptures and vivid wall paintings. Women occupied a remarkably elevated position in Tang court life — more so than in almost any other period of Chinese history. Aristocratic women rode horses, played polo, and attended banquets alongside men. Tomb figurines show them in men's riding clothes, a fashion statement that would have been scandalous in later dynasties. The era produced China's only female emperor: Wu Zetian, who ruled in her own name from 690 to 705 CE and proved a canny patron of Buddhism and the arts. Court ladies were depicted in painting and sculpture with full, rounded faces and elaborate hairstyles — a beauty ideal that celebrated presence and confidence. Look for the exuberance of a culture at its most outward-looking." },
    { start:   907, end:   960, label: "Five Dynasties", context: "A short but turbulent 53-year interregnum after the Tang collapsed. Five successive dynasties — Later Liang, Tang, Jin, Han, and Zhou — each controlled northern China in rapid succession, while ten independent kingdoms fragmented the south. Despite the chaos, court patronage continued and artists refined the intimate landscape painting style that would define the Song." },
    { start:   960, end:  1279, label: "Song Dynasty", context: "Where the Tang dazzled, the Song refined. After a century of fragmentation, the Song court turned inward — philosophically, aesthetically, and literally (the dynasty never fully controlled the north). Neo-Confucian thought prized restraint and moral seriousness, and the art followed. Potters at the great kiln centers — Ru, Ding, Guan, Jun, Ge — pursued perfection in glaze rather than decoration: pale celadons, ivory whites, and blue-grays that seem to hold light inside them. The imperial court collected ancient bronzes and set up academies. Landscape painting became the dominant art form, not as scenery but as a philosophical statement about humanity's place in nature. Look for subtlety — the interest is in what's left out." },
    { start:  1271, end:  1368, label: "Yuan Dynasty" },
    { start:  1368, end:  1644, label: "Ming Dynasty" },
    { start:  1644, end:  1912, label: "Qing Dynasty" },
    { start:  1912, end:  1949, label: "Republic of China" },
    { start:  1949, end:  2026, label: "People's Republic" },
  ],
  "india": [
    { start: -3300, end: -1300, label: "Indus Valley" },
    { start: -1500, end:  -600, label: "Vedic Period" },
    { start:  -600, end:  -322, label: "Mahajanapadas" },
    { start:  -322, end:  -185, label: "Maurya Empire" },
    { start:   185, end:   320, label: "Shunga / Kushan" },
    { start:   320, end:   550, label: "Gupta Empire" },
    { start:   550, end:  1206, label: "Regional Kingdoms" },
    { start:  1206, end:  1526, label: "Delhi Sultanate" },
    { start:  1526, end:  1857, label: "Mughal Empire" },
    { start:  1857, end:  1947, label: "British Raj" },
    { start:  1947, end:  2026, label: "Independent India" },
  ],
  "japan": [
    { start: -3000, end:  -300, label: "Jōmon Period" },
    { start:  -300, end:   300, label: "Yayoi Period" },
    { start:   300, end:   538, label: "Kofun Period" },
    { start:   538, end:   710, label: "Asuka Period" },
    { start:   710, end:   794, label: "Nara Period" },
    { start:   794, end:  1185, label: "Heian Period" },
    { start:  1185, end:  1333, label: "Kamakura Period" },
    { start:  1336, end:  1573, label: "Muromachi Period" },
    { start:  1573, end:  1615, label: "Azuchi-Momoyama" },
    { start:  1615, end:  1868, label: "Edo Period" },
    { start:  1868, end:  1912, label: "Meiji Period" },
    { start:  1912, end:  1926, label: "Taishō Period" },
    { start:  1926, end:  1989, label: "Shōwa Period" },
    { start:  1989, end:  2019, label: "Heisei Period" },
    { start:  2019, end:  2026, label: "Reiwa Period" },
  ],
  "islamic": [
    { start:   622, end:   661, label: "Rashidun Caliphate" },
    { start:   661, end:   750, label: "Umayyad Caliphate" },
    { start:   750, end:  1258, label: "Abbasid Caliphate" },
    { start:  1037, end:  1194, label: "Seljuk Empire" },
    { start:  1258, end:  1517, label: "Mamluk Sultanate" },
    { start:  1299, end:  1922, label: "Ottoman Empire" },
    { start:  1501, end:  1736, label: "Safavid Dynasty" },
    { start:  1736, end:  1900, label: "Qajar & Late Empires" },
    { start:  1900, end:  2026, label: "Modern Islamic World" },
  ],
  "europe": [
    { start: -3000, end:  -500, label: "Pre-Roman" },
    { start:  -500, end:   476, label: "Roman Period" },
    { start:   476, end:   900, label: "Early Medieval" },
    { start:   900, end:  1300, label: "High Medieval" },
    { start:  1300, end:  1400, label: "Late Medieval / Gothic" },
    { start:  1400, end:  1600, label: "Renaissance" },
    { start:  1600, end:  1750, label: "Baroque" },
    { start:  1750, end:  1850, label: "Neoclassical" },
    { start:  1850, end:  1900, label: "Impressionist Era" },
    { start:  1900, end:  1945, label: "Modernism" },
    { start:  1945, end:  1980, label: "Post-War / Abstract" },
    { start:  1980, end:  2026, label: "Contemporary" },
  ],
  "korea": [
    { start: -3000, end:  -57,  label: "Prehistoric" },
    { start:   -57, end:   668, label: "Three Kingdoms", context: "Goguryeo, Baekje, and Silla divided the peninsula for seven centuries. Each kingdom developed a distinct artistic identity — Silla is known for its extraordinary gold crowns and jade comma-shaped ornaments (gogok), while Goguryeo produced vivid tomb murals. Buddhism arrived from China in the 4th century and quickly transformed all three kingdoms' visual culture, spawning distinctive bronze gilt Buddhas." },
    { start:   668, end:   918, label: "Unified Silla" },
    { start:   918, end:  1392, label: "Goryeo Dynasty", context: "The Goryeo court gave the world some of its most refined ceramics ever made. Goryeo celadons — with their distinctive jade-green glaze and inlaid slip decoration (sanggam) — were so prized that Chinese connoisseurs ranked them among the finest in the world. The dynasty was deeply Buddhist, and this shaped its arts: illustrated sutras, reliquaries, and ritual objects were produced to an extraordinary level of refinement." },
    { start:  1392, end:  1897, label: "Joseon Dynasty", context: "The Joseon dynasty's embrace of Neo-Confucianism brought a deliberate turn away from Buddhist luxury arts toward simplicity and scholarly values. White porcelain — pure, unadorned, morally virtuous — became the prestige ware. Joseon painters developed a distinctively Korean ink painting tradition, and the late Joseon period saw a flourishing of genre scenes depicting ordinary Korean life with warmth and humor." },
    { start:  1897, end:  1945, label: "Korean Empire / Colonial" },
    { start:  1945, end:  2026, label: "Modern Korea" },
  ],
  "southeast-asia": [
    { start: -3000, end:   100, label: "Prehistoric / Austronesian" },
    { start:   100, end:   550, label: "Funan & Early Kingdoms" },
    { start:   550, end:   802, label: "Post-Funan Kingdoms" },
    { start:   802, end:  1432, label: "Khmer Empire", context: "The Khmer Empire built Angkor — one of the largest pre-industrial cities on earth — and filled it with stone temples whose sculptural programs rank among humanity's greatest artistic achievements. Khmer sculpture of the Angkor period is known for its serene power: figures with closed eyes and slight smiles that convey both divine authority and inner calm. The empire's wealth came from rice and trade, and its art synthesized Indian religious iconography with distinctly Southeast Asian sensibilities." },
    { start:  1432, end:  1800, label: "Post-Angkor / Regional Kingdoms" },
    { start:  1800, end:  1945, label: "Colonial Era" },
    { start:  1945, end:  2026, label: "Independence & Contemporary" },
  ],
  "africa": [
    { start: -3000, end:  -500, label: "Iron Age / Early Kingdoms" },
    { start:  -500, end:   800, label: "Nok & Iron Age Cultures", context: "The Nok culture of central Nigeria (c. 500 BCE–200 CE) produced the earliest known sub-Saharan sculptural tradition: remarkable terracotta heads with pierced eyes and elaborate hairstyles. These works — some life-sized — hint at a sophisticated society about which we know almost nothing. They mark the beginning of a rich and varied sculptural tradition that would continue for millennia across West and Central Africa." },
    { start:   800, end:  1400, label: "Medieval Kingdoms", context: "This period saw the rise of great West African empires — Ghana, Mali, and Songhai — that controlled trans-Saharan gold and salt trade. Mali at its height was one of the wealthiest states in the world; Mansa Musa's 1324 pilgrimage to Mecca, during which he spent so much gold that he depressed its price across the Mediterranean for a decade, shocked the Islamic world. Court arts — bronze casting, gold jewelry, woven textiles — reflected this extraordinary wealth." },
    { start:  1400, end:  1800, label: "Early Modern Kingdoms", context: "The kingdom of Benin (in present-day Nigeria) produced some of Africa's most celebrated art: brass plaques and portrait heads cast using the lost-wax process, commemorating kings (obas) and court officials with remarkable psychological presence. Benin artists worked exclusively for the royal court, and their output documents centuries of political history. Across the continent, the Kongo kingdom, Great Zimbabwe, and the Swahili Coast city-states each developed sophisticated visual cultures tied to trade, ancestor veneration, and royal power." },
    { start:  1800, end:  1960, label: "Colonial Period" },
    { start:  1960, end:  2026, label: "Independence & Contemporary" },
  ],
  "oceania": [
    { start: -3000, end:  1500, label: "Traditional / Pre-Contact" },
    { start:  1500, end:  1800, label: "Contact Period" },
    { start:  1800, end:  1900, label: "19th Century" },
    { start:  1900, end:  2026, label: "Modern & Contemporary" },
  ],
  "americas": [
    { start: -3000, end: -1200, label: "Archaic Period" },
    { start: -1200, end:  -400, label: "Early Formative / Olmec", context: "The Olmec of Mexico's Gulf Coast are often called the 'mother culture' of Mesoamerica — the first complex society in the region, whose iconography (the were-jaguar, the ballgame, axes and figurines of jade) spread across later civilizations. Their colossal stone heads, some weighing 20 tons, are among the most recognizable artworks of the ancient Americas. Jade was the prestige material par excellence, valued above gold." },
    { start:  -400, end:   200, label: "Late Formative" },
    { start:   200, end:   900, label: "Classic Period", context: "The Classic period saw Mesoamerica's greatest civilizations flourish simultaneously: Teotihuacan dominated central Mexico with a grid-planned city of 100,000+ people; the Maya built ceremonial centers across the Yucatán and Guatemala, developing the only fully writing system in the pre-Columbian Americas; and in the Andes, the Moche produced the finest ceramic portrait vessels and gold metalwork in South American history. These cultures never met directly, yet developed remarkably sophisticated art traditions in parallel." },
    { start:   900, end:  1521, label: "Post-Classic", context: "After the collapse of Classic period centers, new powers rose. The Aztec (Mexica) built Tenochtitlan — an island city of 200,000 people in Lake Texcoco — and created an art of imperial grandeur: massive stone sculptures of gods and cosmic forces, turquoise mosaic masks, and featherwork of breathtaking delicacy. In the Andes, the Inca built the largest empire in pre-Columbian history, knitting it together with roads, relay runners, and an administrative system encoded not in writing but in knotted strings called quipu." },
    { start:  1521, end:  1900, label: "Colonial & Early Modern" },
    { start:  1900, end:  2026, label: "Modern & Contemporary" },
  ],
};

function getCivEra(civId: string, year: number): string | null {
  const eras = CIV_ERAS[civId];
  if (!eras) return null;
  const era = eras.find((e) => year >= e.start && year < e.end);
  return era?.label ?? null;
}

const TICK_YEARS: { year: number; mobileHide?: boolean }[] = [
  { year: -7000 },
  { year: -5000, mobileHide: true },
  { year: -3000 },
  { year: -1000, mobileHide: true },
  { year: 0 },
  { year: 500,  mobileHide: true },
  { year: 1000, mobileHide: true },
  { year: 1500 },
  { year: 2000 },
];

const WINDOW_PRESETS = [
  { label: "±50 yr",  value: 50  },
  { label: "±150 yr", value: 150 },
  { label: "±300 yr", value: 300 },
  { label: "±500 yr", value: 500 },
];

export default function TimelineView({ objects, civilizations }: Props) {
  const [year, setYear]     = useState(0);
  const [window_, setWindow] = useState(150);
  const [dragging, setDragging] = useState(false);
  const [openContext, setOpenContext] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const civMap = new Map(civilizations.map((c) => [c.id, c]));

  // Derive visible objects
  const visible = objects
    .filter((o) => Math.abs(o.year - year) <= window_)
    .sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year));

  // Slider interaction
  function yearFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track) return year;
    const { left, width } = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(START + pct * RANGE);
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setYear(yearFromPointer(e.clientX));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setYear(yearFromPointer(e.clientX));
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerUp = useCallback(() => setDragging(false), []);

  // Density sparkline: count objects per bucket across the timeline
  const BUCKETS = 200;
  const density = Array(BUCKETS).fill(0) as number[];
  for (const obj of objects) {
    const idx = Math.floor(((obj.year - START) / RANGE) * (BUCKETS - 1));
    if (idx >= 0 && idx < BUCKETS) density[idx]++;
  }
  const maxDensity = Math.max(...density, 1);
  const thumbPct = ((year - START) / RANGE) * 100;

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-3.5rem)]">
      {/* ── Header ── */}
      <div className="px-3 sm:px-6 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h1 className="font-serif text-lg sm:text-xl text-[var(--foreground)]">Art Through the Ages</h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {visible.length} objects · {formatYear(year - window_)} – {formatYear(year + window_)}
            </p>
          </div>

          {/* Window presets */}
          <div className="flex items-center gap-1 shrink-0">
            {WINDOW_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setWindow(p.value)}
                className={`text-xs px-2 sm:px-2.5 py-1 rounded-full border transition-colors ${
                  window_ === p.value
                    ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrubber ── */}
        <div className="relative pt-1 pb-5 cursor-col-resize">
          {/* Density sparkline */}
          <div
            ref={trackRef}
            className="relative h-10 rounded overflow-hidden bg-[var(--border)]/30"
            style={{ userSelect: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* Density bars */}
            <div className="absolute inset-0 flex items-end gap-px px-0">
              {density.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 transition-none"
                  style={{
                    height: `${(count / maxDensity) * 100}%`,
                    backgroundColor: `rgba(100,90,80,${0.15 + (count / maxDensity) * 0.55})`,
                  }}
                />
              ))}
            </div>

            {/* Active window highlight */}
            <div
              className="absolute inset-y-0 pointer-events-none"
              style={{
                left:  `${Math.max(0, ((year - window_ - START) / RANGE) * 100)}%`,
                right: `${Math.max(0, 100 - ((year + window_ - START) / RANGE) * 100)}%`,
                backgroundColor: "rgba(180,150,100,0.18)",
                borderLeft:  "1px solid rgba(180,150,100,0.5)",
                borderRight: "1px solid rgba(180,150,100,0.5)",
              }}
            />

            {/* Thumb */}
            <div
              className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
              style={{
                left: `${thumbPct}%`,
                backgroundColor: "var(--foreground)",
                transform: "translateX(-50%)",
              }}
            >
              {/* Year bubble */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full
                            bg-[var(--foreground)] text-[var(--background)]
                            text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap pointer-events-none"
              >
                {formatYear(year)}
              </div>
            </div>
          </div>

          {/* Tick labels */}
          <div className="relative h-5 mt-1">
            {TICK_YEARS.map(({ year: y, mobileHide }, i) => {
              const pct = ((y - START) / RANGE) * 100;
              const isFirst = i === 0;
              const isLast = i === TICK_YEARS.length - 1;
              return (
                <span
                  key={y}
                  className={`absolute text-[9px] text-[var(--muted)] whitespace-nowrap ${mobileHide ? "hidden sm:inline" : ""}`}
                  style={{
                    left: isFirst ? 0 : isLast ? "auto" : `${pct}%`,
                    right: isLast ? 0 : "auto",
                    transform: (!isFirst && !isLast) ? "translateX(-50%)" : "none",
                  }}
                >
                  {formatYear(y)}
                </span>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Civilization sections ── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-6 sm:space-y-8">
        {civilizations.map((civ) => {
          const civObjects = visible.filter((o) => o.civId === civ.id);
          if (civObjects.length === 0) return null;
          const eraInfo = CIV_ERAS[civ.id]?.find((e) => year >= e.start && year < e.end);

          return (
            <div key={civ.id}>
              {/* Section header */}
              <div className="mb-3 pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: civ.color }} />
                    <h2 className="font-serif text-base text-[var(--foreground)]">{civ.label}</h2>
                  </div>
                  {eraInfo && (
                    <span className="text-xs text-[var(--muted)]">{eraInfo.label}</span>
                  )}
                  {eraInfo?.context && (
                    <button
                      onClick={() => setOpenContext(openContext === civ.id ? null : civ.id)}
                      className="w-4 h-4 rounded-full border border-[var(--border)] text-[var(--muted)]
                                 hover:border-[var(--muted)] hover:text-[var(--foreground)] transition-colors
                                 flex items-center justify-center text-[9px] leading-none shrink-0"
                      title={openContext === civ.id ? "Hide note" : "Show era note"}
                    >
                      i
                    </button>
                  )}
                  <span className="text-[10px] text-[var(--muted)] opacity-50 ml-auto">
                    {civObjects.length} object{civObjects.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {eraInfo?.context && openContext === civ.id && (
                  <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed max-w-2xl">
                    {eraInfo.context}
                  </p>
                )}
              </div>

              {/* Objects row */}
              <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                {civObjects.map((obj) => (
                  <Link
                    key={obj.id}
                    href={`/object/${obj.id}`}
                    className="group flex flex-col rounded-md overflow-hidden border border-[var(--border)]
                               hover:border-[var(--accent)] transition-colors bg-[var(--background)]"
                  >
                    <div className="aspect-square overflow-hidden bg-[var(--border)]/30">
                      {obj.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={obj.thumbnailUrl}
                          alt={obj.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full" style={{ backgroundColor: civ.color + "22" }} />
                      )}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-snug">
                        {obj.title}
                      </p>
                      {obj.culture && (
                        <p className="text-[10px] font-medium mt-0.5 truncate" style={{ color: civ.color }}>
                          {obj.culture}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--muted)] mt-0.5 truncate opacity-70">{obj.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--muted)] text-sm">
            <p>No objects in this window.</p>
            <p className="text-xs mt-1 opacity-60">Try widening the time range.</p>
          </div>
        )}
      </div>
    </div>
  );
}
