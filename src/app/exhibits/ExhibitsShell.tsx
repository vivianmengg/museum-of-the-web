"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import LocalExhibits from "./LocalExhibits";
import FavoritesGrid from "./FavoritesGrid";
import { createClient } from "@/lib/supabase/client";

type Tab = "exhibits" | "saved";

type CloudExhibit = {
  id: string;
  title: string;
  statement: string | null;
  is_public: boolean;
  created_at: string;
  exhibit_objects: { object_id: string; institution: string; position: number }[];
};

export default function ExhibitsShell() {
  const [tab, setTab] = useState<Tab>("exhibits");
  const [cloudExhibits, setCloudExhibits] = useState<CloudExhibit[] | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setSignedIn(true);
        fetchCloudExhibits();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setSignedIn(true);
        fetchCloudExhibits();
      } else {
        setSignedIn(false);
        setCloudExhibits(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchCloudExhibits() {
    try {
      const res = await fetch("/api/exhibits");
      if (res.ok) setCloudExhibits(await res.json());
    } catch { /* ignore */ }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-lora)] italic text-4xl mb-1">
            My collection
          </h1>
        </div>
        <Link
          href="/exhibit/new"
          className="text-sm border border-[var(--border)] px-4 py-1.5 rounded-full hover:border-[var(--muted)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          + New exhibit
        </Link>
      </div>

      <div className="flex gap-1 mb-8 border-b border-[var(--border)]">
        {(["exhibits", "saved"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize transition-colors relative ${
              tab === t
                ? "text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "exhibits" ? "Exhibits" : "Saved objects"}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--foreground)]" />
            )}
          </button>
        ))}
      </div>

      {tab === "exhibits" ? (
        signedIn && cloudExhibits !== null ? (
          <CloudExhibitsList exhibits={cloudExhibits} />
        ) : (
          <LocalExhibits />
        )
      ) : (
        <FavoritesGrid />
      )}
    </div>
  );
}

function CloudExhibitsList({ exhibits }: { exhibits: CloudExhibit[] }) {
  if (exhibits.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--muted)] mb-6">No exhibits yet.</p>
        <Link
          href="/exhibit/new"
          className="text-sm border border-[var(--border)] px-5 py-2 rounded-full hover:border-[var(--muted)] transition-colors"
        >
          Build your first exhibit
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-px">
      {exhibits.map((exhibit) => (
        <Link
          key={exhibit.id}
          href={`/exhibit/${exhibit.id}`}
          className="group flex gap-6 p-5 border border-[var(--border)] bg-white hover:border-[var(--muted)] transition-colors"
        >
          <div className="flex gap-1 flex-shrink-0">
            {exhibit.exhibit_objects
              .sort((a, b) => a.position - b.position)
              .slice(0, 4)
              .map((o) => (
                <div key={o.object_id} className="relative w-14 h-14 overflow-hidden bg-[var(--border)]">
                  <CloudThumb objectId={o.object_id} />
                </div>
              ))}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-[family-name:var(--font-lora)] italic text-lg leading-snug mb-1">
              {exhibit.title}
            </h2>
            {exhibit.statement && (
              <p className="text-[var(--muted)] text-sm line-clamp-2 mb-2">{exhibit.statement}</p>
            )}
            <p className="text-xs text-[var(--muted)] opacity-50">
              {exhibit.exhibit_objects.length} objects ·{" "}
              {exhibit.is_public ? "Public" : "Private"} ·{" "}
              {new Date(exhibit.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function CloudThumb({ objectId }: { objectId: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("objects_cache")
      .select("thumbnail_url")
      .eq("id", objectId)
      .maybeSingle()
      .then(({ data }) => setUrl(data?.thumbnail_url ?? null));
  }, [objectId]);

  if (!url) return null;
  return <Image src={url} alt="" fill sizes="56px" className="object-cover" unoptimized />;
}
