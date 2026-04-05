"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnpublishButton({ exhibitId }: { exhibitId: string }) {
  const [confirm, setConfirm] = useState(false);
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

  if (confirm) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--muted)]">Unpublish this exhibit?</span>
        <button
          onClick={handleUnpublish}
          disabled={loading}
          className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          {loading ? "Unpublishing…" : "Yes, unpublish"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors"
    >
      Unpublish
    </button>
  );
}
