"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback } from "react";
import type { MuseumObject } from "@/types";

interface Props {
  artistName: string;
  initialObjects: MuseumObject[];
  total: number;
}

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id:           row.id as string,
    institution:  row.institution as MuseumObject["institution"],
    title:        (row.title as string) || "Untitled",
    date:         (row.date as string) || "",
    culture:      (row.culture as string) || "",
    medium:       (row.medium as string) || "",
    imageUrl:     (row.image_url as string | null) || null,
    thumbnailUrl: (row.thumbnail_url as string | null) || null,
    imageWidth:   (row.image_width as number) || 4,
    imageHeight:  (row.image_height as number) || 3,
    department:   (row.department as string) || "",
    artistName:   (row.artist_name as string) || "",
    creditLine:   (row.credit_line as string) || "",
    dimensions:   (row.dimensions as string) || "",
    objectUrl:    (row.object_url as string | null) || null,
  };
}

export default function ArtistGrid({ artistName, initialObjects, total }: Props) {
  const [objects, setObjects] = useState<MuseumObject[]>(initialObjects);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artist-objects?name=${encodeURIComponent(artistName)}&page=${page}`);
      const data = await res.json();
      const incoming = (data.objects ?? []).map(rowToObject);
      setObjects((prev) => [...prev, ...incoming]);
      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  }, [artistName, page]);

  const hasMore = objects.length < total;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {objects.map((obj) => (
          <Link
            key={obj.id}
            href={`/object/${obj.id}`}
            className="block group relative aspect-square overflow-hidden rounded-md bg-[var(--border)]/20"
          >
            {obj.thumbnailUrl && (
              <Image
                src={obj.thumbnailUrl}
                alt={obj.title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover"
                unoptimized
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-xs leading-snug line-clamp-2">{obj.title}</p>
              {obj.date && <p className="text-white/70 text-[10px] mt-0.5">{obj.date}</p>}
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--muted)] mb-3">
            Showing {objects.length} of {total.toLocaleString()} works
          </p>
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-5 py-2 text-sm border border-[var(--border)] rounded-full hover:border-[var(--foreground)] transition-colors disabled:opacity-40"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
