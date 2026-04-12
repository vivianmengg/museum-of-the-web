"use client";

import Link from "next/link";
import type { MuseumObject } from "@/types";

export default function RegionGrid({
  objects,
  color,
}: {
  objects: MuseumObject[];
  color: string;
}) {
  return (
    <>
      <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
        {objects.map((obj) => (
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

      {objects.length === 0 && (
        <p className="text-sm text-[var(--muted)] text-center py-16">No objects found.</p>
      )}
    </>
  );
}
