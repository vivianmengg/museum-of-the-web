"use client";

import { useState, useMemo } from "react";
import type { MuseumObject } from "@/types";
import ObjectCard from "@/components/ObjectCard";
import TimelineScrubber from "@/components/TimelineScrubber";

const PAGE_SIZE = 300;

export default function RegionGrid({
  objects,
  color,
  yearMap,
  minYear: minYearProp,
  maxYear: maxYearProp,
}: {
  objects: MuseumObject[];
  color: string;
  yearMap: Record<string, number>;
  minYear?: number;
  maxYear?: number;
}) {
  void color;

  const years = useMemo(
    () => objects.map((o) => yearMap[o.id]).filter((y) => y !== undefined) as number[],
    [objects, yearMap]
  );

  const minYear = minYearProp ?? (years.length ? Math.max(Math.min(...years), -7000) : -3000);
  const maxYear = maxYearProp ?? (years.length ? Math.min(Math.max(...years), 2026) : 2026);
  const midYear = Math.round((minYear + maxYear) / 2);

  const [year, setYear]      = useState(midYear);
  const [window_, setWindow] = useState<number | null>(null);
  const [shown, setShown]    = useState(PAGE_SIZE);

  const visible = useMemo(() => {
    if (window_ === null) return objects;
    return objects.filter((o) => {
      const y = yearMap[o.id];
      if (y === undefined) return false;
      return y >= year - window_ && y <= year + window_;
    });
  }, [objects, yearMap, year, window_]);

  // Reset pagination when filter changes
  const paged = visible.slice(0, shown);
  const hasMore = visible.length > shown;

  function handleWindowChange(w: number | null) {
    setShown(PAGE_SIZE);
    setWindow(w);
  }

  return (
    <>
      <TimelineScrubber
        years={years}
        year={year}
        window={window_}
        onYearChange={(y) => { setShown(PAGE_SIZE); setYear(y); }}
        onWindowChange={handleWindowChange}
        visibleCount={visible.length}
        start={minYear}
        end={maxYear}
      />

      <div className="columns-2 sm:columns-3 lg:columns-4 gap-1">
        {paged.map((obj) => (
          <div key={obj.id} className="mb-1">
            <ObjectCard object={obj} />
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-[var(--muted)] text-center py-16">No objects in this range.</p>
      )}

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setShown((s) => s + PAGE_SIZE)}
            className="text-sm px-5 py-2 rounded-full border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors"
          >
            Load more ({visible.length - shown} remaining)
          </button>
        </div>
      )}
    </>
  );
}
