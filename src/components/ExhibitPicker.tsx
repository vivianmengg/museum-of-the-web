"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useLocalExhibits } from "@/lib/useLocalExhibits";
import { createClient } from "@/lib/supabase/client";
import type { MuseumObject } from "@/types";

type Props = {
  object: MuseumObject;
  onClose: () => void;
};

type CloudExhibit = {
  id: string;
  title: string;
  objectCount: number;
  thumbnails: string[];
  hasObject: boolean;
};

export default function ExhibitPicker({ object, onClose }: Props) {
  const local = useLocalExhibits();
  const [signedIn, setSignedIn] = useState(false);
  const [cloudExhibits, setCloudExhibits] = useState<CloudExhibit[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth and load cloud exhibits
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setSignedIn(true); loadCloudExhibits(); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCloudExhibits = useCallback(async () => {
    const supabase = createClient();
    const { data: exhibits } = await supabase
      .from("exhibits")
      .select("id, title, exhibit_objects(object_id, position)")
      .order("created_at", { ascending: false });

    if (!exhibits) return;

    const result: CloudExhibit[] = await Promise.all(
      exhibits.map(async (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const objs = (e.exhibit_objects as any[]).sort((a, b) => a.position - b.position);
        const previewIds = objs.slice(0, 2).map((o) => o.object_id);
        const thumbnails: string[] = [];
        if (previewIds.length > 0) {
          const { data: rows } = await supabase
            .from("objects_cache")
            .select("id, thumbnail_url")
            .in("id", previewIds);
          previewIds.forEach((id) => {
            const row = rows?.find((r) => r.id === id);
            if (row?.thumbnail_url) thumbnails.push(row.thumbnail_url);
          });
        }
        return {
          id: e.id,
          title: e.title,
          objectCount: objs.length,
          thumbnails,
          hasObject: objs.some((o) => o.object_id === object.id),
        };
      })
    );
    setCloudExhibits(result);
  }, [object.id]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  async function handleCloudToggle(exhibit: CloudExhibit) {
    const supabase = createClient();
    if (exhibit.hasObject) {
      await supabase
        .from("exhibit_objects")
        .delete()
        .eq("exhibit_id", exhibit.id)
        .eq("object_id", object.id);
    } else {
      const maxPos = Math.max(-1, ...cloudExhibits
        .find((e) => e.id === exhibit.id)?.thumbnails.map((_, i) => i) ?? []);
      await supabase.from("exhibit_objects").insert({
        exhibit_id: exhibit.id,
        object_id: object.id,
        institution: object.institution,
        curator_note: "",
        position: maxPos + 1,
      });
    }
    setCloudExhibits((prev) =>
      prev.map((e) => e.id === exhibit.id
        ? { ...e, hasObject: !e.hasObject, objectCount: e.objectCount + (e.hasObject ? -1 : 1) }
        : e
      )
    );
  }

  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || submitting) return;
    setSubmitting(true);
    if (signedIn) {
      const res = await fetch("/api/exhibits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          statement: "",
          objects: [{ object_id: object.id, institution: object.institution, curator_note: "" }],
        }),
      });
      if (res.ok) await loadCloudExhibits();
    } else {
      local.createWithObject(newTitle, object);
    }
    setNewTitle("");
    setCreating(false);
    setSubmitting(false);
  }

  function handleLocalToggle(exhibitId: string) {
    if (local.hasObject(exhibitId, object.id)) {
      local.removeObject(exhibitId, object.id);
    } else {
      local.addObject(exhibitId, object);
    }
  }

  const exhibits = signedIn ? cloudExhibits : local.exhibits;
  const isEmpty = exhibits.length === 0;

  return (
    <div
      ref={ref}
      className="absolute top-10 right-0 z-50 w-56 bg-white border border-[var(--border)] shadow-lg rounded-lg overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted)]">Add to exhibit</p>
      </div>

      {isEmpty && !creating && (
        <div className="px-3 py-3 text-xs text-[var(--muted)]">No exhibits yet.</div>
      )}

      <div className="max-h-48 overflow-y-auto">
        {signedIn
          ? cloudExhibits.map((exhibit) => (
              <button
                key={exhibit.id}
                onClick={() => handleCloudToggle(exhibit)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--background)] transition-colors text-left"
              >
                <div className="flex gap-0.5 flex-shrink-0">
                  {exhibit.thumbnails.slice(0, 2).map((url, i) => (
                    <div key={i} className="relative w-6 h-6 overflow-hidden bg-[var(--border)] rounded-sm">
                      <Image src={url} alt="" fill sizes="24px" className="object-cover" unoptimized />
                    </div>
                  ))}
                  {exhibit.thumbnails.length === 0 && <div className="w-6 h-6 bg-[var(--border)] rounded-sm" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate font-medium">{exhibit.title}</p>
                  <p className="text-[10px] text-[var(--muted)]">{exhibit.objectCount} objects</p>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                  exhibit.hasObject ? "bg-[var(--foreground)] border-[var(--foreground)]" : "border-[var(--border)]"
                }`}>
                  {exhibit.hasObject && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            ))
          : local.exhibits.map((exhibit) => {
              const inExhibit = local.hasObject(exhibit.id, object.id);
              return (
                <button
                  key={exhibit.id}
                  onClick={() => handleLocalToggle(exhibit.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--background)] transition-colors text-left"
                >
                  <div className="flex gap-0.5 flex-shrink-0">
                    {exhibit.objects.slice(0, 2).map(({ object: obj }) => (
                      <div key={obj.id} className="relative w-6 h-6 overflow-hidden bg-[var(--border)] rounded-sm">
                        {obj.thumbnailUrl && (
                          <Image src={obj.thumbnailUrl} alt="" fill sizes="24px" className="object-cover" unoptimized />
                        )}
                      </div>
                    ))}
                    {exhibit.objects.length === 0 && <div className="w-6 h-6 bg-[var(--border)] rounded-sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate font-medium">{exhibit.title}</p>
                    <p className="text-[10px] text-[var(--muted)]">{exhibit.objects.length} objects</p>
                  </div>
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
            })
        }
      </div>

      <div className="border-t border-[var(--border)]">
        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1 px-3 py-2">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Exhibit name…"
              className="flex-1 text-xs bg-transparent outline-none placeholder:text-[var(--border)]"
              onKeyDown={(e) => { if (e.key === "Escape") setCreating(false); }}
            />
            <button type="submit" disabled={submitting} className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-1 disabled:opacity-40">
              {submitting ? "…" : "Add"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)]">✕</button>
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
