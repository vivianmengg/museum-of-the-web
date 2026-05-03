"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLocalExhibits } from "@/lib/useLocalExhibits";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./Toast";
import type { MuseumObject } from "@/types";

type Props = {
  object: MuseumObject;
  onClose: () => void;
};

type CloudExhibit = {
  id: string;
  title: string;
  objectCount: number;
  maxPosition: number;
  thumbnails: string[];
  hasObject: boolean;
};

export default function ExhibitPicker({ object, onClose }: Props) {
  const local = useLocalExhibits();
  const { show: showToast } = useToast();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [cloudExhibits, setCloudExhibits] = useState<CloudExhibit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check auth and load cloud exhibits
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSignedIn(true);
        loadCloudExhibits(data.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCloudExhibits = useCallback(async (userId?: string) => {
    const supabase = createClient();
    // Use passed userId if available to avoid a second getUser() round trip
    let uid = userId;
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      uid = user.id;
    }
    const { data: exhibits } = await supabase
      .from("exhibits")
      .select("id, title, exhibit_objects(object_id, position)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (!exhibits) return;

    // Collect all preview IDs in one pass, then fetch thumbnails in a single query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exhibitObjs = exhibits.map((e) => (e.exhibit_objects as any[]).sort((a, b) => a.position - b.position));
    const allPreviewIds = [...new Set(exhibitObjs.flatMap((objs) => objs.slice(0, 2).map((o: { object_id: string }) => o.object_id)))];

    const thumbMap: Record<string, string> = {};
    if (allPreviewIds.length > 0) {
      const { data: rows } = await supabase
        .from("objects_cache")
        .select("id, thumbnail_url")
        .in("id", allPreviewIds);
      for (const row of rows ?? []) {
        if (row.thumbnail_url) thumbMap[row.id] = row.thumbnail_url;
      }
    }

    const result: CloudExhibit[] = exhibits.map((e, i) => {
      const objs = exhibitObjs[i];
      const previewIds = objs.slice(0, 2).map((o: { object_id: string }) => o.object_id);
      const thumbnails = previewIds.flatMap((id: string) => thumbMap[id] ? [thumbMap[id]] : []);
      const maxPosition = objs.length > 0 ? Math.max(...objs.map((o: { position: number }) => o.position)) : -1;
      return {
        id: e.id,
        title: e.title,
        objectCount: objs.length,
        maxPosition,
        thumbnails,
        hasObject: objs.some((o: { object_id: string }) => o.object_id === object.id),
      };
    });
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

    // Re-fetch fresh state first to avoid acting on stale hasObject
    const { data: existing } = await supabase
      .from("exhibit_objects")
      .select("object_id")
      .eq("exhibit_id", exhibit.id)
      .eq("object_id", object.id)
      .maybeSingle();

    const alreadyIn = !!existing;
    console.log("toggle", { objectId: object.id, exhibitId: exhibit.id, alreadyIn, existing });

    if (alreadyIn) {
      const { error } = await supabase
        .from("exhibit_objects")
        .delete()
        .eq("exhibit_id", exhibit.id)
        .eq("object_id", object.id);
      if (error) { console.error("delete error", error); return; }
    } else {
      const pos = (cloudExhibits.find((e) => e.id === exhibit.id)?.maxPosition ?? -1) + 1;
      const { error } = await supabase.from("exhibit_objects").insert({
        exhibit_id: exhibit.id,
        object_id: object.id,
        institution: object.institution,
        curator_note: "",
        position: pos,
      });
      if (error) { console.error("insert error", error); return; }
    }
    setCloudExhibits((prev) =>
      prev.map((e) => e.id === exhibit.id
        ? { ...e, hasObject: !alreadyIn, objectCount: e.objectCount + (alreadyIn ? -1 : 1) }
        : e
      )
    );
    if (!alreadyIn) showToast({ message: "Added.", href: "/exhibits", linkLabel: "View your collection →" });
    onClose();
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
    showToast({ message: "Added.", href: "/exhibits", linkLabel: "View your collection →" });
    setNewTitle("");
    setCreating(false);
    setSubmitting(false);
  }

  function handleLocalToggle(exhibitId: string) {
    if (local.hasObject(exhibitId, object.id)) {
      local.removeObject(exhibitId, object.id);
    } else {
      local.addObject(exhibitId, object);
      showToast({ message: "Added.", href: "/exhibits", linkLabel: "View your collection →" });
    }
    onClose();
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

      {loading && (
        <div className="px-3 py-3 text-xs text-[var(--muted)] animate-pulse">Loading…</div>
      )}
      {!loading && isEmpty && !creating && (
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

      {!signedIn && (
        <div className="px-3 py-2 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--muted)]">
            <a href={`/auth?next=${encodeURIComponent(pathname)}`} className="text-[var(--foreground)] underline underline-offset-2">Sign in</a>
            {" "}to sync your collection across devices.
          </p>
        </div>
      )}

      <div className="border-t border-[var(--border)]">
        {creating ? (
          <form onSubmit={handleCreate} className="flex items-center gap-1 px-3 py-2">
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Collection name…"
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
            <span className="text-base leading-none">+</span> New collection
          </button>
        )}
      </div>
    </div>
  );
}
