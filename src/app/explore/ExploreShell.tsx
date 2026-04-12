"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ObjectCard from "@/components/ObjectCard";
import type { MuseumObject } from "@/types";
import type { PublicExhibit } from "./page";

type Tab = "artifacts" | "exhibits";

export default function ExploreShell({
  exhibits,
  artifacts,
}: {
  exhibits: PublicExhibit[];
  artifacts: MuseumObject[];
}) {
  const [tab, setTab] = useState<Tab>("exhibits");

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header + toggle */}
      <div className="flex items-end justify-between mb-8">
        <h1 className="font-[family-name:var(--font-lora)] italic text-4xl">Explore</h1>

        <div className="flex items-center gap-1 border border-[var(--border)] rounded-full p-1">
          {(["exhibits", "artifacts"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1 text-sm rounded-full transition-colors capitalize ${
                tab === t
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t === "exhibits" ? "Collections" : "Artifacts"}
            </button>
          ))}
        </div>
      </div>

      {tab === "exhibits" ? (
        <ExhibitsView exhibits={exhibits} />
      ) : (
        <ArtifactsView artifacts={artifacts} />
      )}
    </div>
  );
}

// ─── Exhibits ─────────────────────────────────────────────────────────────────

function ExhibitsView({ exhibits }: { exhibits: PublicExhibit[] }) {
  if (exhibits.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-[var(--muted)] text-sm mb-4">No published collections yet.</p>
        <Link
          href="/exhibit/new"
          className="text-sm border border-[var(--border)] px-5 py-2 rounded-full hover:border-[var(--muted)] transition-colors"
        >
          Build one →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)]">
      {exhibits.map((exhibit) => (
        <ExhibitCard key={exhibit.id} exhibit={exhibit} />
      ))}
    </div>
  );
}

function ExhibitCard({ exhibit }: { exhibit: PublicExhibit }) {
  const hasPreviews = exhibit.previews.some((p) => p.thumbnailUrl);

  return (
    <Link
      href={`/exhibit/${exhibit.id}`}
      className="group bg-[var(--background)] flex flex-col hover:bg-[#f5f3ef] transition-colors"
    >
      {/* Thumbnail grid */}
      <div className="aspect-[4/3] grid grid-cols-2 grid-rows-2 gap-px bg-[var(--border)] overflow-hidden">
        {hasPreviews ? (
          exhibit.previews.slice(0, 4).map((p, i) => (
            <div key={i} className="relative bg-[var(--shimmer)] overflow-hidden">
              {p.thumbnailUrl && (
                <Image
                  src={p.thumbnailUrl}
                  alt={p.title}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>
          ))
        ) : (
          // Placeholder when no images yet
          <div className="col-span-2 row-span-2 flex items-center justify-center bg-[var(--shimmer)]">
            <span className="font-[family-name:var(--font-lora)] italic text-[var(--muted)] text-sm opacity-50">
              {exhibit.title}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-lora)] italic text-lg leading-snug mb-1 group-hover:opacity-70 transition-opacity">
            {exhibit.title}
          </h2>
          {exhibit.statement && (
            <p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
              {exhibit.statement}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">
            by <span className="text-[var(--foreground)]">{exhibit.curator}</span>
          </p>
          <p className="text-xs text-[var(--muted)] opacity-50">
            {exhibit.object_count} object{exhibit.object_count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ─── Artifacts ────────────────────────────────────────────────────────────────

function ArtifactsView({ artifacts }: { artifacts: MuseumObject[] }) {
  if (artifacts.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-[var(--muted)] text-sm mb-4">
          No artifacts yet — publish an exhibit to surface objects here.
        </p>
        <Link
          href="/"
          className="text-sm border border-[var(--border)] px-5 py-2 rounded-full hover:border-[var(--muted)] transition-colors"
        >
          Browse collection →
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-[var(--muted)] mb-4 opacity-60">
        {artifacts.length} objects curated by the community
      </p>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-1">
        {artifacts.map((obj) => (
          <div key={obj.id} className="mb-1">
            <ObjectCard object={obj} />
          </div>
        ))}
      </div>
    </>
  );
}
