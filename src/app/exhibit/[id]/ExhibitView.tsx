"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocalExhibits, type LocalExhibit } from "@/lib/useLocalExhibits";
import ExhibitContent from "@/components/ExhibitContent";

export default function ExhibitView({ id }: { id: string }) {
  const { exhibits, remove } = useLocalExhibits();
  const [exhibit, setExhibit] = useState<LocalExhibit | null | "loading">("loading");

  useEffect(() => {
    if (exhibits.length > 0 || exhibit !== "loading") {
      setExhibit(exhibits.find((e) => e.id === id) ?? null);
    }
  }, [exhibits, id, exhibit]);

  if (exhibit === "loading") return <div className="min-h-screen" />;

  if (!exhibit) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-[var(--muted)] mb-6">Exhibit not found.</p>
          <Link href="/exhibits" className="text-sm border border-[var(--border)] px-5 py-2 rounded-full hover:border-[var(--muted)] transition-colors">
            My collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ExhibitContent
      exhibit={{
        ...exhibit,
        isPublished: false,
      }}
      actions={
        <ExhibitActions
          exhibit={exhibit}
          onDelete={() => { remove(exhibit.id); window.location.href = "/exhibits"; }}
        />
      }
    />
  );
}

function ExhibitActions({
  exhibit,
  onDelete,
}: {
  exhibit: LocalExhibit;
  onDelete: () => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/exhibits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exhibit.title,
          statement: exhibit.statement,
          objects: exhibit.objects.map(({ object, note }) => ({
            object_id: object.id,
            institution: object.institution,
            curator_note: note,
          })),
        }),
      });

      if (res.status === 401) {
        router.push(`/auth?next=/exhibit/${exhibit.id}`);
        return;
      }

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Publish failed");
      }

      const { id } = await res.json();
      router.push(`/exhibit/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPublishing(false);
    }
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="text-sm px-5 py-1.5 bg-[var(--foreground)] text-[var(--background)] rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {publishing ? "Publishing…" : "Publish exhibit"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {confirmDelete ? (
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--muted)]">Delete this exhibit?</span>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-600 transition-colors">Yes, delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors">
          Delete
        </button>
      )}
    </div>
  );
}
