"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import type { Civilization, TimelineObject } from "./page";

interface Props {
  objects: TimelineObject[];
  civilizations: Civilization[];
}

const START = -3000;
const END   = 1900;
const RANGE = END - START;

function formatYear(y: number): string {
  const abs = Math.abs(Math.round(y));
  if (y < 0)  return `${abs} BCE`;
  if (y === 0) return "0";
  return `${abs} CE`;
}

type EraRange = { start: number; end: number; label: string };

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
    { start:   641, end:  1900, label: "Islamic Egypt" },
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
  ],
  "china": [
    { start: -2100, end: -1600, label: "Xia Dynasty" },
    { start: -1600, end: -1046, label: "Shang Dynasty" },
    { start: -1046, end:  -256, label: "Zhou Dynasty" },
    { start:  -221, end:  -206, label: "Qin Dynasty" },
    { start:  -206, end:   220, label: "Han Dynasty" },
    { start:   220, end:   581, label: "Six Dynasties" },
    { start:   581, end:   618, label: "Sui Dynasty" },
    { start:   618, end:   907, label: "Tang Dynasty" },
    { start:   907, end:   960, label: "Five Dynasties" },
    { start:   960, end:  1279, label: "Song Dynasty" },
    { start:  1271, end:  1368, label: "Yuan Dynasty" },
    { start:  1368, end:  1644, label: "Ming Dynasty" },
    { start:  1644, end:  1912, label: "Qing Dynasty" },
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
  ],
  "islamic": [
    { start:   622, end:   661, label: "Rashidun Caliphate" },
    { start:   661, end:   750, label: "Umayyad Caliphate" },
    { start:   750, end:  1258, label: "Abbasid Caliphate" },
    { start:  1037, end:  1194, label: "Seljuk Empire" },
    { start:  1258, end:  1517, label: "Mamluk Sultanate" },
    { start:  1299, end:  1922, label: "Ottoman Empire" },
    { start:  1501, end:  1736, label: "Safavid Dynasty" },
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
  ],
};

function getCivEra(civId: string, year: number): string | null {
  const eras = CIV_ERAS[civId];
  if (!eras) return null;
  const era = eras.find((e) => year >= e.start && year < e.end);
  return era?.label ?? null;
}

const TICK_YEARS = [-3000, -2500, -2000, -1500, -1000, -500, 0, 500, 1000, 1500];

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
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 border-b border-[var(--border)] shrink-0">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h1 className="font-serif text-xl text-[var(--foreground)]">Art Through the Ages</h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {visible.length} objects · {formatYear(year - window_)} – {formatYear(year + window_)}
            </p>
          </div>

          {/* Window presets */}
          <div className="flex items-center gap-1">
            {WINDOW_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setWindow(p.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
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
            {TICK_YEARS.map((y) => {
              const pct = ((y - START) / RANGE) * 100;
              return (
                <span
                  key={y}
                  className="absolute text-[9px] text-[var(--muted)] -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${pct}%` }}
                >
                  {formatYear(y)}
                </span>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Civilization sections ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
        {civilizations.map((civ) => {
          const civObjects = visible.filter((o) => o.civId === civ.id);
          if (civObjects.length === 0) return null;
          const era = getCivEra(civ.id, year);

          return (
            <div key={civ.id}>
              {/* Section header */}
              <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: civ.color }} />
                  <h2 className="font-serif text-base text-[var(--foreground)]">{civ.label}</h2>
                </div>
                {era && (
                  <span className="text-xs text-[var(--muted)]">{era}</span>
                )}
                <span className="text-[10px] text-[var(--muted)] opacity-50 ml-auto">
                  {civObjects.length} object{civObjects.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Objects row */}
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
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
