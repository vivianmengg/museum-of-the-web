"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCuration } from "@/components/CurationContext";
import { useLocalExhibits } from "@/lib/useLocalExhibits";
import type { MuseumObject } from "@/types";

type ObjectEntry = {
  object: MuseumObject;
  note: string;
};

export default function ExhibitBuilder() {
  const { selected, toggle, clear } = useCuration();
  const { save } = useLocalExhibits();
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function setNote(id: string, note: string) {
    setNotes((prev) => ({ ...prev, [id]: note }));
  }

  function move(index: number, dir: -1 | 1) {
    // reordering is visual only — we use the selected array order
    // for now, we can't reorder the CurationContext array directly
    // so we track a local order override
    setOrder((prev) => {
      const next = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  // Local order: start as indices 0..n
  const [order, setOrder] = useState<number[]>(() =>
    selected.map((_, i) => i)
  );

  // Sync order when selected changes (new pins added)
  const orderedObjects: ObjectEntry[] = order
    .filter((i) => i < selected.length)
    .map((i) => ({ object: selected[i], note: notes[selected[i].id] ?? "" }));

  // If nothing selected yet
  if (selected.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="font-[family-name:var(--font-lora)] italic text-3xl mb-4">
          New collection
        </h1>
        <p className="text-[var(--muted)] mb-8">
          No objects selected yet. Browse the collection and tap{" "}
          <span className="inline-block w-5 h-5 rounded-full border border-[var(--muted)] text-center leading-5 text-xs">+</span>{" "}
          on any image to add it.
        </p>
        <Link
          href="/"
          className="text-sm border border-[var(--border)] px-5 py-2 rounded-full hover:border-[var(--muted)] transition-colors"
        >
          Browse collection
        </Link>
      </div>
    );
  }

  function handleSave() {
    const draft = {
      title: title.trim() || "Untitled collection",
      statement,
      objects: orderedObjects,
    };
    const id = save(draft);
    setSavedId(id);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  const STATEMENT_MAX = 500;
  const NOTE_MAX = 280;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10 gap-4">
        <div className="flex-1">
          <label className="block text-[10px] tracking-widest uppercase text-[var(--muted)] mb-2">
            Collection title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled collection"
            className="w-full font-[family-name:var(--font-lora)] italic text-3xl bg-transparent border-b border-[var(--border)] focus:border-[var(--muted)] outline-none pb-1 placeholder:text-[var(--border)] transition-colors"
          />
        </div>
        <div className="flex-shrink-0 mt-6 flex items-center gap-3">
          {savedId && (
            <Link
              href="/exhibits"
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              View saved →
            </Link>
          )}
          <button
            onClick={handleSave}
            aria-label="Save locally"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--muted)] transition-all duration-200 group"
          >
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              className="transition-all duration-200"
            >
              <path
                d="M8 13.5S2 9.5 2 5.5A3.5 3.5 0 0 1 8 3.67 3.5 3.5 0 0 1 14 5.5C14 9.5 8 13.5 8 13.5Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={justSaved ? "currentColor" : "none"}
                className={justSaved ? "text-red-400" : "text-[var(--foreground)] group-hover:text-red-400"}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Curatorial statement */}
      <div className="mb-10">
        <label className="block text-[10px] tracking-widest uppercase text-[var(--muted)] mb-2">
          Curatorial statement
        </label>
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value.slice(0, STATEMENT_MAX))}
          placeholder="What connects these objects? What do you want visitors to feel?"
          rows={3}
          className="w-full bg-transparent border border-[var(--border)] focus:border-[var(--muted)] outline-none p-3 text-sm leading-relaxed resize-none placeholder:text-[var(--border)] transition-colors"
        />
        <p className="text-right text-xs text-[var(--muted)] mt-1 opacity-50">
          {statement.length} / {STATEMENT_MAX}
        </p>
      </div>

      {/* Object list */}
      <div className="space-y-1">
        <label className="block text-[10px] tracking-widest uppercase text-[var(--muted)] mb-3">
          Objects — {orderedObjects.length}
        </label>

        {orderedObjects.map(({ object, note }, idx) => (
          <div
            key={object.id}
            className="group flex gap-4 p-3 border border-[var(--border)] bg-white hover:border-[var(--muted)] transition-colors"
          >
            {/* Thumbnail */}
            <Link href={`/object/${object.id}`} className="flex-shrink-0">
              <div className="relative w-16 h-16 overflow-hidden bg-[var(--border)]">
                {object.thumbnailUrl && (
                  <Image
                    src={object.thumbnailUrl}
                    alt={object.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            </Link>

            {/* Title + note */}
            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-lora)] italic text-sm leading-snug line-clamp-1 mb-1">
                {object.title}
              </p>
              <p className="text-[var(--muted)] text-xs mb-2">
                {[object.date, object.culture].filter(Boolean).join(" · ")}
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(object.id, e.target.value.slice(0, NOTE_MAX))}
                placeholder="Add a note about this object…"
                rows={2}
                className="w-full bg-transparent text-xs leading-relaxed resize-none outline-none placeholder:text-[var(--border)] border-b border-transparent focus:border-[var(--border)] transition-colors"
              />
              {note.length > 0 && (
                <p className="text-right text-[10px] text-[var(--muted)] opacity-40">
                  {note.length} / {NOTE_MAX}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-20 transition-colors"
                aria-label="Move up"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 7l3-4 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === orderedObjects.length - 1}
                className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-20 transition-colors"
                aria-label="Move down"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => toggle(object)}
                className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-red-400 transition-colors mt-1"
                aria-label="Remove"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
        <Link
          href="/"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ← Add more objects
        </Link>
        <button
          onClick={clear}
          className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
