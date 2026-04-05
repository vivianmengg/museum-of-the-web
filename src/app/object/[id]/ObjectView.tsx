"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { MuseumObject } from "@/types";
import TracesSection from "@/components/TracesSection";
import PresencePanel from "@/components/PresencePanel";

const INSTITUTION_LABELS: Record<string, string> = {
  met: "The Metropolitan Museum of Art",
  aic: "Art Institute of Chicago",
  rijks: "Rijksmuseum",
  moma: "Museum of Modern Art",
};

export default function ObjectView({ object, currentUserId }: { object: MuseumObject; currentUserId: string | null }) {
  const [imgExpanded, setImgExpanded] = useState(false);

  const metaRows = [
    { label: "Artist", value: object.artistName },
    { label: "Date", value: object.date },
    { label: "Culture", value: object.culture },
    { label: "Medium", value: object.medium },
    { label: "Dimensions", value: object.dimensions },
    { label: "Department", value: object.department },
    { label: "Credit", value: object.creditLine },
  ].filter((r) => r.value);

  return (
    <div className="min-h-screen">

      {/* Full-bleed image */}
      <div
        className={`w-full bg-[#1a1916] flex items-center justify-center transition-all duration-500 ${
          imgExpanded ? "min-h-screen" : "min-h-[55vh] max-h-[75vh]"
        }`}
        style={{ cursor: imgExpanded ? "zoom-out" : "zoom-in" }}
        onClick={() => setImgExpanded((v) => !v)}
      >
        {object.imageUrl ? (
          <div className={`relative w-full transition-all duration-500 ${imgExpanded ? "h-screen" : "h-[55vh]"}`}>
            <Image
              src={object.imageUrl}
              alt={object.title}
              fill
              sizes="100vw"
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        ) : (
          <div className="text-[#6b6560] text-sm py-24">No image available</div>
        )}
      </div>

      {/* Two-column layout below image */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-8 block"
        >
          ← Browse
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] items-start divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">

          {/* Left — description */}
          <div className="lg:pr-16">
            <span className="text-[10px] tracking-widest uppercase text-[var(--muted)] mb-3 block">
              {INSTITUTION_LABELS[object.institution] ?? object.institution}
            </span>
            <h1 className="font-[family-name:var(--font-lora)] italic text-3xl sm:text-4xl leading-snug mb-2">
              {object.title}
            </h1>
            {object.artistName && (
              <p className="text-[var(--muted)] text-base mb-8">{object.artistName}</p>
            )}

            {metaRows.length > 0 && (
              <dl className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                {metaRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[120px_1fr] py-3 gap-4">
                    <dt className="text-xs uppercase tracking-wide text-[var(--muted)] pt-0.5">
                      {row.label}
                    </dt>
                    <dd className="text-sm leading-relaxed">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {object.objectUrl && (
              <a
                href={object.objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors underline underline-offset-2 mt-8 block"
              >
                View on {INSTITUTION_LABELS[object.institution] ?? object.institution} →
              </a>
            )}
          </div>

          {/* Right — interactive */}
          <div className="lg:sticky lg:top-20 lg:pl-16 pt-12 lg:pt-0">
            <PresencePanel objectId={object.id} currentUserId={currentUserId} />
            <TracesSection
              objectId={object.id}
              institution={object.institution}
              currentUserId={currentUserId}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
