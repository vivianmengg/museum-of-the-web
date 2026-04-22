"use client";

import { useState } from "react";
import Link from "next/link";
import type { Institution } from "@/lib/institutions";
import type { MuseumObject } from "@/types";

interface Props {
  institution: Institution;
  highlights: MuseumObject[];
  objects: MuseumObject[];
  totalCount: number;
}

function ObjectCard({ obj }: { obj: MuseumObject }) {
  return (
    <Link
      href={`/object/${obj.id}`}
      className="group flex flex-col rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--muted)] transition-colors bg-[var(--background)]"
    >
      <div className="aspect-square overflow-hidden bg-[var(--shimmer)]">
        {obj.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={obj.thumbnailUrl}
            alt={obj.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-snug">{obj.title}</p>
        {obj.artistName && (
          <p className="text-[10px] text-[var(--muted)] mt-0.5 truncate">{obj.artistName}</p>
        )}
        {obj.date && (
          <p className="text-[10px] text-[var(--muted)] opacity-60 mt-0.5 truncate">{obj.date}</p>
        )}
      </div>
    </Link>
  );
}

const PAGE_SIZE = 48;

export default function InstitutionPage({ institution, highlights, objects, totalCount }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

      {/* Breadcrumb */}
      <Link
        href="/institution"
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-8 inline-block"
      >
        ← All institutions
      </Link>

      {/* ── Editorial header ── */}
      <div className="mb-10 sm:mb-14">
        {/* Accent line */}
        <div className="h-px mb-6" style={{ backgroundColor: institution.color }} />

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Location + claim badge */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-[var(--muted)]">{institution.location}</span>
              {institution.founded && (
                <>
                  <span className="text-[var(--border)]">·</span>
                  <span className="text-xs text-[var(--muted)]">Est. {institution.founded}</span>
                </>
              )}
              {!institution.claimed && (
                <span className="ml-1 text-[9px] text-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">
                  unclaimed
                </span>
              )}
            </div>

            {/* Name */}
            <h1 className="font-serif italic text-3xl sm:text-5xl text-[var(--foreground)] leading-tight mb-4">
              {institution.label}
            </h1>

            {/* Description */}
            <p className="text-sm text-[var(--muted)] leading-relaxed max-w-2xl">
              {institution.description}
            </p>
          </div>

          {/* Right column: meta + CTA */}
          <div className="shrink-0 flex flex-col items-start sm:items-end gap-3 sm:pt-8">
            <div className="text-right">
              <p className="text-2xl font-serif text-[var(--foreground)]">{totalCount.toLocaleString()}</p>
              <p className="text-xs text-[var(--muted)]">objects on Patina</p>
            </div>
            <a
              href={institution.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors underline underline-offset-2"
            >
              Visit website →
            </a>
            {!institution.claimed && (
              <button
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition-colors"
                onClick={() => alert("Claim page feature coming soon — reach out to hello@withpatina.com")}
              >
                Claim this page
              </button>
            )}
          </div>
        </div>

        {/* Accent line bottom */}
        <div className="h-px mt-8" style={{ backgroundColor: institution.color + "44" }} />
      </div>

      {/* ── Highlights ── */}
      {highlights.length > 0 && (
        <section className="mb-12 sm:mb-16">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif italic text-xl text-[var(--foreground)]">Highlights</h2>
            <span className="text-xs text-[var(--muted)]">{highlights.length} selected works</span>
          </div>

          {/* Horizontal scroll on mobile, wrap on desktop */}
          <div className="flex sm:grid sm:grid-cols-4 md:grid-cols-6 gap-3 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            {highlights.map((obj) => (
              <div key={obj.id} className="shrink-0 w-36 sm:w-auto">
                <ObjectCard obj={obj} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── From the collection ── */}
      {objects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif italic text-xl text-[var(--foreground)]">From the collection</h2>
            <span className="text-xs text-[var(--muted)]">{objects.length.toLocaleString()} objects</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {objects.slice(0, visibleCount).map((obj) => (
              <ObjectCard key={obj.id} obj={obj} />
            ))}
          </div>

          {visibleCount < objects.length && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-sm px-6 py-2 rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
