"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback } from "react";
import type { MuseumObject } from "@/types";
import { useFavorites } from "@/lib/useFavorites";
import { useLocalExhibits } from "@/lib/useLocalExhibits";
import ExhibitPicker from "./ExhibitPicker";

export default function ObjectCard({ object, fillParent, priority }: { object: MuseumObject; fillParent?: boolean; priority?: boolean }) {
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const { objectExhibits } = useLocalExhibits();
  const [pickerOpen, setPickerOpen] = useState(false);

  const hearted = isFavorited(object.id);
  const pinnedCount = objectExhibits(object.id).length;
  const pinned = pinnedCount > 0;

  const closePicker = useCallback(() => setPickerOpen(false), []);

  if (!object.thumbnailUrl) return null;

  const paddingBottom = `${(object.imageHeight / object.imageWidth) * 100}%`;

  return (
    <div className={`group relative${fillParent ? " h-full" : ""}`}>
      <Link href={`/object/${object.id}`} className={`block${fillParent ? " h-full" : ""}`}>
        <div
          className="relative w-full overflow-hidden bg-[#d8d4cc]"
          style={fillParent ? { height: "100%" } : { paddingBottom }}
        >
          <div className="absolute inset-0 animate-pulse bg-[#d8d4cc]" aria-hidden />
          <Image
            src={object.thumbnailUrl}
            alt={object.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover"
            quality={60}
            priority={priority}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
            <p className="text-white font-[family-name:var(--font-lora)] italic text-sm leading-snug line-clamp-2 drop-shadow">
              {object.title}
            </p>
            {(object.date || object.culture) && (
              <p className="text-white/70 text-xs mt-0.5 drop-shadow">
                {[object.date, object.culture].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Heart — save to favorites */}
      <button
        onClick={() => toggleFavorite(object)}
        aria-label={hearted ? "Unfavorite" : "Save to favorites"}
        className={`absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition-all duration-150 bg-white/90
          ${hearted ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"}`}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path
            d="M6.5 11S1.5 7.5 1.5 4.5a2.5 2.5 0 0 1 5-0.3 2.5 2.5 0 0 1 5 0.3C11.5 7.5 6.5 11 6.5 11Z"
            stroke={hearted ? "#e11d48" : "currentColor"}
            strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
            fill={hearted ? "#e11d48" : "none"}
            className="text-[var(--foreground)]"
          />
        </svg>
      </button>

      {/* Pin — opens exhibit picker */}
      <div className="absolute top-2 right-2">
        <button
          onClick={(e) => { e.preventDefault(); setPickerOpen((v) => !v); }}
          aria-label="Add to exhibit"
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow transition-all duration-150
            ${pinned
              ? "bg-[var(--foreground)] text-[var(--background)] opacity-100 scale-100"
              : "bg-white/90 text-[var(--foreground)] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
            }`}
        >
          {pinned ? (
            // filled pin
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1.5l1.2 2.7 2.8.4-2 2 .5 2.8L6 8.1l-2.5 1.3.5-2.8-2-2 2.8-.4L6 1.5Z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {/* badge showing how many exhibits */}
          {pinnedCount > 1 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[var(--foreground)] text-[var(--background)] text-[8px] flex items-center justify-center">
              {pinnedCount}
            </span>
          )}
        </button>

        {pickerOpen && <ExhibitPicker object={object} onClose={closePicker} />}
      </div>

      {pinned && (
        <div className="absolute inset-0 ring-2 ring-[var(--foreground)] pointer-events-none" />
      )}
    </div>
  );
}
