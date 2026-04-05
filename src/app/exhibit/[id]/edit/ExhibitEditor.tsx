"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ExhibitEntry } from "@/components/ExhibitContent";

type Props = {
  exhibit: {
    id: string;
    title: string;
    statement: string;
    objects: ExhibitEntry[];
  };
};

export default function ExhibitEditor({ exhibit }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(exhibit.title);
  const [statement, setStatement] = useState(exhibit.statement);
  const [objects, setObjects] = useState(exhibit.objects);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemoveObject(objectId: string) {
    const res = await fetch("/api/exhibits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: exhibit.id, remove_object_id: objectId }),
    });
    if (res.ok) {
      setObjects((prev) => prev.filter((e) => e.object.id !== objectId));
    }
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/exhibits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: exhibit.id, title, statement }),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/exhibit/${exhibit.id}`);
    } else {
      const body = await res.json();
      setError(body.error ?? "Save failed");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href={`/exhibit/${exhibit.id}`}
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-10 block"
      >
        ← Cancel
      </Link>

      <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-8">Edit exhibit</h2>

      {/* Title */}
      <div className="mb-6">
        <label className="text-xs uppercase tracking-wide text-[var(--muted)] mb-2 block">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full font-[family-name:var(--font-lora)] italic text-3xl bg-transparent border-b border-[var(--border)] focus:border-[var(--muted)] focus:outline-none pb-2 transition-colors"
          placeholder="Exhibit title…"
        />
      </div>

      {/* Statement */}
      <div className="mb-12">
        <label className="text-xs uppercase tracking-wide text-[var(--muted)] mb-2 block">Statement</label>
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          rows={4}
          className="w-full text-sm bg-transparent border border-[var(--border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--muted)] placeholder:text-[var(--muted)] resize-none transition-colors"
          placeholder="A note on what this exhibit is about…"
        />
      </div>

      {/* Objects */}
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wide text-[var(--muted)] mb-4">
          Objects · {objects.length}
        </p>
        {objects.length === 0 && (
          <p className="text-sm text-[var(--muted)] italic">No objects in this exhibit.</p>
        )}
        <div className="space-y-3">
          {objects.map(({ object }) => (
            <div key={object.id} className="flex items-center gap-4 group">
              {object.thumbnailUrl && (
                <div className="relative w-12 h-12 flex-shrink-0 overflow-hidden bg-[#d8d4cc]">
                  <Image src={object.thumbnailUrl} alt={object.title} fill sizes="48px" className="object-cover" unoptimized />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{object.title}</p>
                {(object.artistName || object.date) && (
                  <p className="text-xs text-[var(--muted)] truncate">{[object.artistName, object.date].filter(Boolean).join(" · ")}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveObject(object.id)}
                className="text-xs text-[var(--muted)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                aria-label="Remove from exhibit"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="text-sm px-6 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/exhibit/${exhibit.id}`}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Cancel
        </Link>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
