"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnpublishButton({ exhibitId }: { exhibitId: string }) {
  const [confirm, setConfirm] = useState<"unpublish" | "delete" | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUnpublish() {
    setLoading(true);
    const res = await fetch("/api/exhibits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: exhibitId, is_public: false }),
    });
    setLoading(false);
    if (res.ok) router.push("/exhibits");
  }

  async function handleDelete() {
    setLoading(true);
    const res = await fetch("/api/exhibits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: exhibitId }),
    });
    setLoading(false);
    if (res.ok) router.push("/exhibits");
  }

  if (confirm === "unpublish") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--muted)]">Unpublish this exhibit?</span>
        <button onClick={handleUnpublish} disabled={loading} className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
          {loading ? "Unpublishing…" : "Yes, unpublish"}
        </button>
        <button onClick={() => setConfirm(null)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Cancel</button>
      </div>
    );
  }

  if (confirm === "delete") {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--muted)]">Permanently delete?</span>
        <button onClick={handleDelete} disabled={loading} className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
          {loading ? "Deleting…" : "Yes, delete"}
        </button>
        <button onClick={() => setConfirm(null)} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Cancel</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button onClick={() => setConfirm("unpublish")} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
        Unpublish
      </button>
      <button onClick={() => setConfirm("delete")} className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors">
        Delete
      </button>
    </div>
  );
}
