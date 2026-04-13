"use client";

import { useState, useMemo } from "react";
import type { MuseumObject } from "@/types";
import ObjectCard from "@/components/ObjectCard";
import TimelineScrubber from "@/components/TimelineScrubber";

export default function RegionGrid({
  objects,
  color,
  yearMap,
}: {
  objects: MuseumObject[];
  color: string;
  yearMap: Record<string, number>;
}) {
  void color;

  const years = useMemo(
    () => objects.map((o) => yearMap[o.id]).filter((y) => y !== undefined) as number[],
    [objects, yearMap]
  );

  const minYear = years.length ? Math.min(...years) : -3000;
  const maxYear = years.length ? Math.max(...years) : 2026;
  const midYear = Math.round((minYear + maxYear) / 2);

  const [year, setYear]     = useState(midYear);
  const [window_, setWindow] = useState(150);

  const visible = useMemo(
    () => objects.filter((o) => {
      const y = yearMap[o.id];
      if (y === undefined) return false;
      return y >= year - window_ && y <= year + window_;
    }),
    [objects, yearMap, year, window_]
  );

  return (
    <>
      <TimelineScrubber
        years={years}
        year={year}
        window={window_}
        onYearChange={setYear}
        onWindowChange={setWindow}
        visibleCount={visible.length}
        start={minYear}
        end={maxYear}
      />

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
