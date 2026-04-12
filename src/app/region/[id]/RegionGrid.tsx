"use client";

import { useState } from "react";
import Link from "next/link";
import type { MuseumObject } from "@/types";

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

  const filtered = activeCulture
    ? objects.filter((o) => o.culture === activeCulture)
    : objects;

  return (
    <>
      {/* Culture sub-filters */}
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

      {/* Grid */}
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
        <p className="text-sm text-[var(--muted)] text-center py-16">No objects found.</p>
      )}
    </>
  );
}
