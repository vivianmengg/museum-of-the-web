"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocalExhibits } from "@/lib/useLocalExhibits";
import type { MuseumObject } from "@/types";

type Props = {
  object: MuseumObject;
  onClose: () => void;
};

export default function ExhibitPicker({ object, onClose }: Props) {
  const { exhibits, addObject, removeObject, createWithObject, hasObject } = useLocalExhibits();
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  // Focus input when creating mode opens
  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!newTitle.trim()) return;
    createWithObject(newTitle, object);
    setNewTitle("");
    setCreating(false);
    // Stay open so user sees the newly created exhibit with a checkmark
  }

  function handleAdd(exhibitId: string) {
    if (hasObject(exhibitId, object.id)) {
      removeObject(exhibitId, object.id);
    } else {
      addObject(exhibitId, object);
    }
  }

  return (
    <div
      ref={ref}
      className="absolute top-10 right-0 z-50 w-56 bg-white border border-[var(--border)] shadow-lg rounded-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Add to exhibit</p>
      </div>

      {exhibits.length === 0 && !creating && (
        <div className="px-3 py-3 text-xs text-[var(--muted)]">No exhibits yet.</div>
      )}

      {/* Exhibit list */}
      <div className="max-h-48 overflow-y-auto">
        {exhibits.map((exhibit) => {
          const inExhibit = hasObject(exhibit.id, object.id);
          return (
            <button
              key={exhibit.id}
              onClick={() => handleAdd(exhibit.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--background)] transition-colors text-left"
            >
              {/* Thumbnail */}
              <div className="flex gap-0.5 flex-shrink-0">
                {exhibit.objects.slice(0, 2).map(({ object: obj }) => (
                  <div key={obj.id} className="relative w-6 h-6 overflow-hidden bg-[var(--border)] rounded-sm">
                    {obj.thumbnailUrl && (
                      <Image src={obj.thumbnailUrl} alt="" fill sizes="24px" className="object-cover" unoptimized />
                    )}
                  </div>
                ))}
                {exhibit.objects.length === 0 && (
                  <div className="w-6 h-6 bg-[var(--border)] rounded-sm" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs truncate font-medium">{exhibit.title}</p>
                <p className="text-[10px] text-[var(--muted)]">{exhibit.objects.length} objects</p>
              </div>

              {/* Check */}
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                inExhibit ? "bg-[var(--foreground)] border-[var(--foreground)]" : "border-[var(--border)]"
              }`}>
                {inExhibit && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* New exhibit */}
      <div className="border-t border-[var(--border)]">
        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1 px-3 py-2">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Exhibit name…"
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-[var(--border)]"
              onKeyDown={(e) => {
                if (e.key === "Escape") setCreating(false);
                if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              }}
            />
            <button
              type="submit"
              onClick={() => handleCreate()}
              className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-1"
            >
              Add
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]">
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            <span className="text-base leading-none">+</span> New exhibit
          </button>
        )}
      </div>
    </div>
  );
}
