"use client";

import { useRef } from "react";

function formatYear(y: number): string {
  const abs = Math.abs(Math.round(y));
  if (y < 0)   return `${abs} BCE`;
  if (y === 0) return "0";
  return `${abs} CE`;
}

// Derive window presets and tick interval from the data span
function deriveScale(span: number): {
  presets: { label: string; value: number }[];
  defaultWindow: number;
  tickInterval: number;
} {
  if (span > 5000) return {
    presets: [
      { label: "±500 yr",  value: 500  },
      { label: "±1000 yr", value: 1000 },
      { label: "±2000 yr", value: 2000 },
      { label: "±5000 yr", value: 5000 },
    ],
    defaultWindow: 500,
    tickInterval: 2000,
  };
  if (span > 1000) return {
    presets: [
      { label: "±100 yr", value: 100 },
      { label: "±200 yr", value: 200 },
      { label: "±500 yr", value: 500 },
    ],
    defaultWindow: 150,
    tickInterval: span > 2000 ? 500 : 200,
  };
  if (span > 200) return {
    presets: [
      { label: "±25 yr",  value: 25  },
      { label: "±50 yr",  value: 50  },
      { label: "±100 yr", value: 100 },
      { label: "±200 yr", value: 200 },
    ],
    defaultWindow: 50,
    tickInterval: 100,
  };
  // Short span (e.g. photography ~200 years)
  return {
    presets: [
      { label: "±10 yr",  value: 10  },
      { label: "±20 yr",  value: 20  },
      { label: "±50 yr",  value: 50  },
      { label: "±100 yr", value: 100 },
    ],
    defaultWindow: 20,
    tickInterval: 20,
  };
}

interface Props {
  years: number[];
  year: number;
  window: number | null;        // null = show all
  onYearChange: (y: number) => void;
  onWindowChange: (w: number | null) => void;
  visibleCount: number;
  start?: number;
  end?: number;
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

  const { presets, defaultWindow, tickInterval } = deriveScale(end - start);

  const trackRef    = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Keep latest callbacks + state in refs so pointer handlers never go stale
  const startRef        = useRef(start);
  const rangeRef        = useRef(range);
  const windowRef       = useRef(window_);
  const onYearChangeRef = useRef(onYearChange);
  const onWindowChangeRef = useRef(onWindowChange);
  startRef.current          = start;
  rangeRef.current          = range;
  windowRef.current         = window_;
  onYearChangeRef.current   = onYearChange;
  onWindowChangeRef.current = onWindowChange;

  // Density sparkline
  const BUCKETS = 200;
  const density = Array(BUCKETS).fill(0) as number[];
  for (const y of years) {
    const idx = Math.floor(((y - start) / range) * (BUCKETS - 1));
    if (idx >= 0 && idx < BUCKETS) density[idx]++;
  }
  const maxDensity = Math.max(...density, 1);
  const thumbPct   = window_ !== null ? ((year - start) / range) * 100 : null;

  function yearFromPointer(clientX: number): number {
    const track = trackRef.current;
    if (!track) return year;
    const { left, width } = track.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - left) / width));
    return Math.round(startRef.current + pct * rangeRef.current);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    const newYear = yearFromPointer(e.clientX);
    onYearChangeRef.current(newYear);
    if (windowRef.current === null) {
      onWindowChangeRef.current(defaultWindow);
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    onYearChangeRef.current(yearFromPointer(e.clientX));
  }

  function onPointerUp() {
    draggingRef.current = false;
  }

  // Tick marks
  const firstTick = Math.ceil(start / tickInterval) * tickInterval;
  const ticks: number[] = [];
  for (let t = firstTick; t <= end; t += tickInterval) ticks.push(t);

  return (
    <div className="mb-8">
      {/* Presets row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 flex-wrap">
          {presets.map((p) => (
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
          {window_ !== null && (
            <button
              onClick={() => onWindowChange(null)}
              className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Reset view
            </button>
          )}
        </div>
        <p className="text-xs text-[var(--muted)] shrink-0">
          {window_ === null
            ? `${visibleCount} objects`
            : `${formatYear(year - window_)} – ${formatYear(year + window_)}`}
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
          onPointerUp={onPointerUp}
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
          {window_ !== null && (
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
          )}

          {/* Thumb */}
          {thumbPct !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 pointer-events-none"
              style={{
                left: `${thumbPct}%`,
                backgroundColor: "var(--foreground)",
                transform: "translateX(-50%)",
              }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full
                              bg-[var(--foreground)] text-[var(--background)]
                              text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap pointer-events-none">
                {formatYear(year)}
              </div>
            </div>
          )}
        </div>

        {/* Tick labels */}
        <div className="relative h-5 mt-1">
          {ticks.map((t, i) => {
            const pct     = ((t - start) / range) * 100;
            const isFirst = i === 0;
            const isLast  = i === ticks.length - 1;
            return (
              <span
                key={t}
                className="absolute text-[9px] text-[var(--muted)] whitespace-nowrap"
                style={{
                  left:      isFirst ? 0 : isLast ? "auto" : `${pct}%`,
                  right:     isLast ? 0 : "auto",
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
