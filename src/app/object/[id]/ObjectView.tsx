"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MuseumObject } from "@/types";
import TracesSection from "@/components/TracesSection";
import PresencePanel from "@/components/PresencePanel";
import ExhibitPicker from "@/components/ExhibitPicker";

const INSTITUTION_LABELS: Record<string, string> = {
  met: "The Metropolitan Museum of Art",
  aic: "Art Institute of Chicago",
  rijks: "Rijksmuseum",
  moma: "Museum of Modern Art",
};

export default function ObjectView({ object, currentUserId }: { object: MuseumObject; currentUserId: string | null }) {
  const [imgExpanded, setImgExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  // Track presence on global site channel as "viewing"
  useEffect(() => {
    const supabase = createClient();
    let anonId = sessionStorage.getItem("motw_anon_id");
    if (!anonId) {
      anonId = crypto.randomUUID();
      sessionStorage.setItem("motw_anon_id", anonId);
    }
    const channel = supabase.channel("motw:site");
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: anonId,
          status: "viewing",
          objectId: object.id,
          objectTitle: object.title,
        });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [object.id, object.title]);

  const metaRows = [
    { label: "Artist", value: object.artistName },
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
        className={`relative w-full bg-[#1a1916] flex items-center justify-center transition-all duration-500 ${
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

        {/* Add to exhibit — floating over image */}
        <div
          className="absolute bottom-4 right-4 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-xs text-[var(--foreground)] rounded-full shadow hover:bg-white transition-colors"
          >
            <span className="text-sm leading-none">+</span> Add to exhibit
          </button>
          {pickerOpen && <ExhibitPicker object={object} onClose={closePicker} />}
        </div>
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
            {(object.artistName || object.date) && (
              <p className="text-[var(--muted)] text-base mb-8">
                {[object.artistName, object.date].filter(Boolean).join(", ")}
              </p>
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
