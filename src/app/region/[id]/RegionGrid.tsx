"use client";

import { useState, useMemo } from "react";
import type { MuseumObject } from "@/types";
import ObjectCard from "@/components/ObjectCard";

const PRESETS = [
  { label: "All", window: null },
  { label: "±100", window: 100 },
  { label: "±250", window: 250 },
  { label: "±500", window: 500 },
];

function formatYear(y: number) {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

export default function RegionGrid({
  objects,
  color,
  yearMap,
}: {
  objects: MuseumObject[];
  color: string;
  yearMap: Record<string, number>;
}) {
  const years = useMemo(
    () => objects.map((o) => yearMap[o.id]).filter((y) => y !== undefined) as number[],
    [objects, yearMap]
  );
  const minYear = years.length ? Math.min(...years) : -3000;
  const maxYear = years.length ? Math.max(...years) : 2000;
  const midYear = Math.round((minYear + maxYear) / 2);

  const [center, setCenter] = useState(midYear);
  const [windowSize, setWindowSize] = useState<number | null>(null);

  const visible = useMemo(() => {
    if (windowSize === null) return objects;
    return objects.filter((o) => {
      const y = yearMap[o.id];
      if (y === undefined) return true;
      return y >= center - windowSize && y <= center + windowSize;
    });
  }, [objects, yearMap, center, windowSize]);

  // suppress unused color warning — kept for potential future use
  void color;

  return (
    <>
      {/* Scrubber */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setWindowSize(p.window)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                windowSize === p.window
                  ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"
              }`}
            >
              {p.label}
            </button>
          ))}
          {windowSize !== null && (
            <span className="text-xs text-[var(--muted)] ml-1">
              {formatYear(center - windowSize)} – {formatYear(center + windowSize)}
            </span>
          )}
        </div>

        {windowSize !== null && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[var(--muted)] w-16 text-right shrink-0">
              {formatYear(minYear)}
            </span>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              value={center}
              onChange={(e) => setCenter(Number(e.target.value))}
              className="flex-1 accent-[var(--foreground)]"
            />
            <span className="text-[10px] text-[var(--muted)] w-16 shrink-0">
              {formatYear(maxYear)}
            </span>
          </div>
        )}

        {windowSize !== null && (
          <p className="text-xs text-[var(--muted)]">{visible.length} objects in range</p>
        )}
      </div>

      {/* Grid — same masonry layout as browse */}
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-1">
        {visible.map((obj) => (
          <div key={obj.id} className="mb-1">
            <ObjectCard object={obj} />
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-[var(--muted)] text-center py-16">No objects in this range.</p>
      )}
    </>
  );
}
