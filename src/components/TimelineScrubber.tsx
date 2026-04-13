"use client";

import { useRef, useCallback } from "react";

function formatYear(y: number): string {
  const abs = Math.abs(Math.round(y));
  if (y < 0)   return `${abs} BCE`;
  if (y === 0) return "0";
  return `${abs} CE`;
}

const WINDOW_PRESETS = [
  { label: "±50 yr",  value: 50  },
  { label: "±150 yr", value: 150 },
  { label: "±300 yr", value: 300 },
  { label: "±500 yr", value: 500 },
];

interface Props {
  years: number[];          // all object years — used to draw the density sparkline
  year: number;
  window: number;
  onYearChange: (y: number) => void;
  onWindowChange: (w: number) => void;
  visibleCount: number;
  start?: number;           // timeline start (default: min year or -7000)
  end?: number;             // timeline end   (default: max year or 2026)
}

export default function TimelineScrubber({
  years,
  year,
  window: window_,
  onYearChange,
  onWindowChange,
  visibleCount,
  start: startProp,
  end: endProp,
}: Props) {
  const start = startProp ?? (years.length ? Math.min(...years) : -7000);
  const end   = endProp   ?? (years.length ? Math.max(...years) : 2026);
  const range = end - start || 1;

  const trackRef = useRef<HTMLDivElement>(null);

  // Density sparkline
  const BUCKETS = 200;
  const density = Array(BUCKETS).fill(0) as number[];
  for (const y of years) {
    const idx = Math.floor(((y - start) / range) * (BUCKETS - 1));
    if (idx >= 0 && idx < BUCKETS) density[idx]++;
  }
  const maxDensity = Math.max(...density, 1);
  const thumbPct = ((year - start) / range) * 100;

  function yearFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track) return year;
    const { left, width } = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(start + pct * range);
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onYearChange(yearFromPointer(e.clientX));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return;
    onYearChange(yearFromPointer(e.clientX));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute sensible tick marks
  const span = end - start;
  const tickInterval = span > 5000 ? 2000 : span > 2000 ? 500 : span > 1000 ? 200 : 100;
  const firstTick = Math.ceil(start / tickInterval) * tickInterval;
  const ticks: number[] = [];
  for (let t = firstTick; t <= end; t += tickInterval) ticks.push(t);

  return (
    <div className="mb-8">
      {/* Window presets + count */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          {WINDOW_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => onWindowChange(p.value)}
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
        <p className="text-xs text-[var(--muted)] shrink-0">
          {visibleCount} objects · {formatYear(year - window_)} – {formatYear(year + window_)}
        </p>
      </div>

      {/* Scrubber track */}
      <div className="relative pt-1 pb-5 cursor-col-resize">
        <div
          ref={trackRef}
          className="relative h-10 rounded overflow-hidden bg-[var(--border)]/30"
          style={{ userSelect: "none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          {/* Density bars */}
          <div className="absolute inset-0 flex items-end">
            {density.map((count, i) => (
              <div
                key={i}
                className="flex-1"
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
              left:  `${Math.max(0, ((year - window_ - start) / range) * 100)}%`,
              right: `${Math.max(0, 100 - ((year + window_ - start) / range) * 100)}%`,
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
          {ticks.map((t, i) => {
            const pct = ((t - start) / range) * 100;
            const isFirst = i === 0;
            const isLast  = i === ticks.length - 1;
            return (
              <span
                key={t}
                className="absolute text-[9px] text-[var(--muted)] whitespace-nowrap"
                style={{
                  left:  isFirst ? 0 : isLast ? "auto" : `${pct}%`,
                  right: isLast ? 0 : "auto",
                  transform: (!isFirst && !isLast) ? "translateX(-50%)" : "none",
                }}
              >
                {formatYear(t)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
