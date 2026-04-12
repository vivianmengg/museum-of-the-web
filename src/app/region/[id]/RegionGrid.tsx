"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import type { MuseumObject } from "@/types";
import { parseDateToYear } from "@/lib/parseDate";

const WINDOW_PRESETS = [
  { label: "±50 yr",  value: 50  },
  { label: "±150 yr", value: 150 },
  { label: "±300 yr", value: 300 },
  { label: "±500 yr", value: 500 },
];

function formatYear(y: number) {
  const abs = Math.abs(Math.round(y));
  if (y < 0) return `${abs} BCE`;
  if (y === 0) return "0";
  return `${abs} CE`;
}

export default function RegionGrid({
  objects,
  cultures,
  color,
}: {
  objects: MuseumObject[];
  cultures: string[];
  color: string;
}) {
  const [activeCulture, setActiveCulture] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [window_, setWindow] = useState(150);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Attach years to objects
  const withYears = useMemo(() =>
    objects.map((o) => {
      const y = o.date ? parseDateToYear(o.date) : null;
      return { obj: o, year: y };
    }),
  [objects]);

  // Timeline range from actual object years
  const years = withYears.map((o) => o.year).filter((y): y is number => y !== null);
  const START = years.length ? Math.min(...years) : -3000;
  const END   = years.length ? Math.max(...years) : 2026;
  const RANGE = Math.max(END - START, 1);
  const BUCKETS = 120;

  // Density sparkline
  const density = useMemo(() => {
    const d = Array(BUCKETS).fill(0) as number[];
    for (const y of years) {
      const idx = Math.floor(((y - START) / RANGE) * (BUCKETS - 1));
      if (idx >= 0 && idx < BUCKETS) d[idx]++;
    }
    return d;
  }, [years, START, RANGE]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxDensity = Math.max(...density, 1);

  // Scrubber interaction
  function yearFromPointer(clientX: number) {
    const track = trackRef.current;
    if (!track) return START;
    const { left, width } = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(START + pct * RANGE);
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setActiveYear(yearFromPointer(e.clientX));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setActiveYear(yearFromPointer(e.clientX));
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerUp = useCallback(() => setDragging(false), []);

  // Filter objects
  const filtered = useMemo(() => {
    let result = withYears;
    if (activeCulture) result = result.filter((o) => o.obj.culture === activeCulture);
    if (activeYear !== null) {
      result = result.filter((o) => o.year !== null && Math.abs(o.year - activeYear) <= window_);
    }
    return result.map((o) => o.obj);
  }, [withYears, activeCulture, activeYear, window_]);

  const thumbPct = activeYear !== null ? ((activeYear - START) / RANGE) * 100 : null;

  return (
    <>
      {/* ── Timeline scrubber (desktop only) ── */}
      <div className="hidden sm:block mb-8 ml-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--muted)]">
            {activeYear !== null
              ? `${formatYear(activeYear - window_)} – ${formatYear(activeYear + window_)}`
              : "Drag to filter by period"}
          </p>
          <div className="flex items-center gap-1.5">
            {WINDOW_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setWindow(p.value)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  window_ === p.value
                    ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {p.label}
              </button>
            ))}
            {activeYear !== null && (
              <>
                <span className="text-[var(--border)] text-xs">·</span>
                <button
                  onClick={() => setActiveYear(null)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  Show all
                </button>
              </>
            )}
          </div>
        </div>

        <div
          ref={trackRef}
          className="relative h-10 rounded overflow-hidden bg-[var(--border)]/30 cursor-col-resize select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Density bars */}
          <div className="absolute inset-0 flex items-end gap-px">
            {density.map((count, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: `${(count / maxDensity) * 100}%`,
                  backgroundColor: count > 0
                    ? `${color}${Math.round(40 + (count / maxDensity) * 180).toString(16).padStart(2, "0")}`
                    : "transparent",
                }}
              />
            ))}
          </div>

          {/* Active window highlight */}
          {activeYear !== null && thumbPct !== null && (
            <div
              className="absolute inset-y-0 pointer-events-none"
              style={{
                left:  `${Math.max(0, ((activeYear - window_ - START) / RANGE) * 100)}%`,
                right: `${Math.max(0, 100 - ((activeYear + window_ - START) / RANGE) * 100)}%`,
                backgroundColor: `${color}30`,
                borderLeft:  `1px solid ${color}80`,
                borderRight: `1px solid ${color}80`,
              }}
            />
          )}

          {/* Thumb */}
          {thumbPct !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
              style={{ left: `${thumbPct}%`, backgroundColor: color, transform: "translateX(-50%)" }}
            >
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full
                  text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap"
                style={{ backgroundColor: color, color: "white" }}
              >
                {formatYear(activeYear!)}
              </div>
            </div>
          )}
        </div>

        {/* Tick labels */}
        <div className="relative h-4 mt-1 text-[9px] text-[var(--muted)]">
          <span className="absolute left-0">{formatYear(START)}</span>
          <span className="absolute left-1/2 -translate-x-1/2">{formatYear(Math.round((START + END) / 2))}</span>
          <span className="absolute right-0">{formatYear(END)}</span>
        </div>
      </div>

      {/* ── Culture sub-filters ── */}
      {cultures.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8 ml-6">
          <button
            onClick={() => setActiveCulture(null)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              activeCulture === null
                ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            All
          </button>
          {cultures.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCulture(c === activeCulture ? null : c)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                activeCulture === c
                  ? "text-white border-transparent"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
              style={activeCulture === c ? { backgroundColor: color } : {}}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* ── Grid ── */}
      <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
        {filtered.map((obj) => (
          <Link
            key={obj.id}
            href={`/object/${obj.id}`}
            className="group block break-inside-avoid rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
          >
            <div
              className="relative overflow-hidden bg-[var(--border)]/30"
              style={{ aspectRatio: `${obj.imageWidth}/${obj.imageHeight}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={obj.thumbnailUrl!}
                alt={obj.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="px-2.5 py-2">
              <p className="text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-snug">
                {obj.title}
              </p>
              {obj.culture && (
                <p className="text-[10px] mt-0.5 truncate" style={{ color }}>
                  {obj.culture}
                </p>
              )}
              {obj.date && (
                <p className="text-[10px] text-[var(--muted)] mt-0.5 opacity-70 truncate">
                  {obj.date}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[var(--muted)] text-center py-16">
          {activeYear !== null ? "No objects in this period." : "No objects found."}
        </p>
      )}
    </>
  );
}
