"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocalExhibits } from "@/lib/useLocalExhibits";

export default function LocalExhibits() {
  const { exhibits, remove } = useLocalExhibits();

  if (exhibits.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--muted)] mb-6">No saved exhibits yet.</p>
        <Link
          href="/"
          className="text-sm border border-[var(--border)] px-5 py-2 rounded-full hover:border-[var(--muted)] transition-colors"
        >
          Browse collection
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-px">
      {exhibits.map((exhibit) => (
        <div
          key={exhibit.id}
          className="group flex gap-6 p-5 border border-[var(--border)] bg-white hover:border-[var(--muted)] transition-colors"
        >
          {/* Thumbnail strip — links to exhibit */}
          <Link href={`/exhibit/${exhibit.id}`} className="flex gap-1 flex-shrink-0">
            {exhibit.objects.slice(0, 4).map(({ object }) => (
              <div
                key={object.id}
                className="relative w-14 h-14 overflow-hidden bg-[var(--border)]"
              >
                {object.thumbnailUrl && (
                  <Image
                    src={object.thumbnailUrl}
                    alt={object.title}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            ))}
            {exhibit.objects.length > 4 && (
              <div className="w-14 h-14 bg-[var(--border)] flex items-center justify-center text-xs text-[var(--muted)]">
                +{exhibit.objects.length - 4}
              </div>
            )}
          </Link>

          {/* Info */}
          <Link href={`/exhibit/${exhibit.id}`} className="flex-1 min-w-0">
            <h2 className="font-[family-name:var(--font-lora)] italic text-lg leading-snug mb-1">
              {exhibit.title}
            </h2>
            {exhibit.statement && (
              <p className="text-[var(--muted)] text-sm line-clamp-2 mb-2">
                {exhibit.statement}
              </p>
            )}
            <p className="text-xs text-[var(--muted)] opacity-50">
              {exhibit.objects.length} objects · saved{" "}
              {new Date(exhibit.savedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              {" "}· local draft
            </p>
          </Link>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link
              href={`/exhibit/new?draft=${exhibit.id}`}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={() => remove(exhibit.id)}
              className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
