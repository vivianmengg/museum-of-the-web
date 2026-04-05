"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MuseumObject } from "@/types";

export type ExhibitEntry = { object: MuseumObject; note: string };

export type ExhibitData = {
  id: string;
  title: string;
  statement: string;
  objects: ExhibitEntry[];
  savedAt: string;
  isPublished?: boolean;
  curatorUsername?: string;
};

type Mode = "gallery" | "meander";

type Props = {
  exhibit: ExhibitData;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode; // slot for publish button, delete, etc.
};

export default function ExhibitContent({
  exhibit,
  backHref = "/exhibits",
  backLabel = "My collection",
  actions,
}: Props) {
  const [mode, setMode] = useState<Mode>("gallery");
  const [cursor, setCursor] = useState(0);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (mode !== "meander") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        setCursor((c) => Math.min(c + 1, exhibit.objects.length - 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        setCursor((c) => Math.max(c - 1, 0));
      if (e.key === "Escape") setMode("gallery");
    },
    [mode, exhibit.objects.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (mode === "meander") {
    return (
      <MeanderMode
        exhibit={exhibit}
        cursor={cursor}
        setCursor={setCursor}
        onClose={() => setMode("gallery")}
      />
    );
  }

  return (
    <GalleryMode
      exhibit={exhibit}
      backHref={backHref}
      backLabel={backLabel}
      actions={actions}
      onMeander={() => { setCursor(0); setMode("meander"); }}
    />
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function GalleryMode({
  exhibit,
  backHref,
  backLabel,
  actions,
  onMeander,
}: {
  exhibit: ExhibitData;
  backHref: string;
  backLabel: string;
  actions?: React.ReactNode;
  onMeander: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href={backHref}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-10 block"
      >
        ← {backLabel}
      </Link>

      {/* Header */}
      <div className="mb-12">
        <h1 className="font-[family-name:var(--font-lora)] italic text-4xl leading-tight mb-4">
          {exhibit.title}
        </h1>
        {exhibit.statement && (
          <p className="text-[var(--muted)] leading-relaxed text-sm max-w-xl">
            {exhibit.statement}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <p className="text-xs text-[var(--muted)] opacity-50">
            {exhibit.objects.length} object{exhibit.objects.length !== 1 ? "s" : ""}
            {exhibit.curatorUsername && (
              <> · curated by <span className="opacity-100">{exhibit.curatorUsername}</span></>
            )}
            {!exhibit.curatorUsername && (
              <> · saved {new Date(exhibit.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
            )}
          </p>
          {exhibit.isPublished && <PublishedBadge id={exhibit.id} />}
        </div>
      </div>

      {/* Actions slot */}
      {actions && <div className="mb-8">{actions}</div>}

      {/* Meander */}
      {exhibit.objects.length > 0 && (
        <button
          onClick={onMeander}
          className="mb-12 text-sm flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors group"
        >
          <span className="w-7 h-7 rounded-full border border-[var(--border)] group-hover:border-[var(--muted)] flex items-center justify-center transition-colors">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M6 2.5l3 2.5-3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Meander through this exhibit
        </button>
      )}

      {/* Objects */}
      <div className="space-y-16">
        {exhibit.objects.map(({ object, note }, idx) => (
          <article key={object.id}>
            <p className="text-[10px] tracking-widest uppercase text-[var(--muted)] opacity-50 mb-3">
              {String(idx + 1).padStart(2, "0")}
            </p>
            {object.imageUrl && (
              <Link href={`/object/${object.id}`}>
                <div
                  className="w-full relative overflow-hidden bg-[#d8d4cc] mb-5"
                  style={{
                    paddingBottom:
                      object.imageHeight && object.imageWidth
                        ? `${(object.imageHeight / object.imageWidth) * 100}%`
                        : "75%",
                  }}
                >
                  <Image
                    src={object.imageUrl}
                    alt={object.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </Link>
            )}
            <div>
              <Link href={`/object/${object.id}`}>
                <h2 className="font-[family-name:var(--font-lora)] italic text-xl leading-snug hover:opacity-70 transition-opacity">
                  {object.title}
                </h2>
              </Link>
              {(object.artistName || object.date || object.culture) && (
                <p className="text-[var(--muted)] text-sm mt-1">
                  {[object.artistName, object.date, object.culture].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            {note && (
              <blockquote className="mt-4 pl-4 border-l-2 border-[var(--border)] text-sm text-[var(--muted)] leading-relaxed italic">
                {note}
              </blockquote>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Published badge + share ──────────────────────────────────────────────────

function PublishedBadge({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(`${window.location.origin}/exhibit/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="text-xs px-2.5 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          copied
        </>
      ) : (
        <>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M5.5 1H8v2.5M8 1 4.5 4.5M3.5 2H1.5A.5.5 0 0 0 1 2.5v5a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5V5.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          copy link
        </>
      )}
    </button>
  );
}

// ─── Meander ─────────────────────────────────────────────────────────────────

function MeanderMode({
  exhibit,
  cursor,
  setCursor,
  onClose,
}: {
  exhibit: ExhibitData;
  cursor: number;
  setCursor: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
}) {
  const total = exhibit.objects.length;
  const { object, note } = exhibit.objects[cursor];

  const prev = () => setCursor((c) => Math.max(c - 1, 0));
  const next = () => setCursor((c) => Math.min(c + 1, total - 1));

  return (
    <div className="fixed inset-0 bg-[var(--background)] z-40 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ← {exhibit.title}
        </button>
        <span className="text-xs text-[var(--muted)]">{cursor + 1} / {total}</span>
      </div>

      <div className="h-px bg-[var(--border)] flex-shrink-0">
        <div
          className="h-full bg-[var(--foreground)] transition-all duration-300"
          style={{ width: `${((cursor + 1) / total) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <button onClick={prev} disabled={cursor === 0} className="absolute left-0 top-0 bottom-0 w-1/3 z-10 disabled:cursor-default cursor-w-resize" aria-label="Previous" />
        <button onClick={next} disabled={cursor === total - 1} className="absolute right-0 top-0 bottom-0 w-1/3 z-10 disabled:cursor-default cursor-e-resize" aria-label="Next" />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 relative bg-[#1a1916] flex items-center justify-center overflow-hidden">
            {object.imageUrl ? (
              <div className="relative w-full h-full">
                <Image src={object.imageUrl} alt={object.title} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-contain" priority unoptimized />
              </div>
            ) : (
              <div className="text-[#6b6560] text-sm">No image</div>
            )}
          </div>

          <div className="lg:w-80 flex-shrink-0 flex flex-col justify-end px-8 py-8 border-t lg:border-t-0 lg:border-l border-[var(--border)] overflow-y-auto">
            <p className="text-[10px] tracking-widest uppercase text-[var(--muted)] opacity-50 mb-3">
              {String(cursor + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </p>
            <Link href={`/object/${object.id}`} className="font-[family-name:var(--font-lora)] italic text-xl leading-snug mb-2 hover:opacity-70 transition-opacity">
              {object.title}
            </Link>
            {(object.artistName || object.date) && (
              <p className="text-sm text-[var(--muted)] mb-4">
                {[object.artistName, object.date].filter(Boolean).join(" · ")}
              </p>
            )}
            {note && (
              <p className="text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-4 italic">
                {note}
              </p>
            )}
            <div className="flex items-center gap-3 mt-8">
              <button onClick={prev} disabled={cursor === 0} className="w-9 h-9 flex items-center justify-center border border-[var(--border)] rounded-full hover:border-[var(--muted)] disabled:opacity-25 transition-colors" aria-label="Previous">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={next} disabled={cursor === total - 1} className="w-9 h-9 flex items-center justify-center border border-[var(--border)] rounded-full hover:border-[var(--muted)] disabled:opacity-25 transition-colors" aria-label="Next">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
