"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

function eraLabel(y: number): string {
  if (y < -1200) return "Bronze Age";
  if (y <  -500) return "Iron Age";
  if (y <   -27) return "Classical Antiquity";
  if (y <   500) return "Roman Era";
  if (y <  1000) return "Early Medieval";
  if (y <  1300) return "High Medieval";
  if (y <  1500) return "Late Medieval";
  if (y <  1700) return "Renaissance";
  return "Early Modern";
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

        {/* Era label */}
        <p className="text-[11px] text-[var(--muted)] tracking-widest uppercase -mt-1">
          {eraLabel(year)}
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[var(--muted)] text-sm">
            <p>No objects in this window.</p>
            <p className="text-xs mt-1 opacity-60">Try widening the time range.</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
            {visible.map((obj) => {
              const civ = civMap.get(obj.civId);
              return (
                <Link
                  key={obj.id}
                  href={`/object/${obj.id}`}
                  className="group flex flex-col rounded-md overflow-hidden border border-[var(--border)]
                             hover:border-[var(--accent)] transition-colors bg-[var(--background)]"
                >
                  {/* Image */}
                  <div className="aspect-square overflow-hidden bg-[var(--border)]/30 relative">
                    {obj.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={obj.thumbnailUrl}
                        alt={obj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: civ ? civ.color + "22" : undefined }}
                      />
                    )}
                    {/* Civilization badge */}
                    {civ && (
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: civ.color }} />
                        <span className="text-[9px] text-white/90 font-medium leading-none">{civ.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-snug">
                      {obj.title}
                    </p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5 truncate">{obj.date}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
