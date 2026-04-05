"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupForm({
  initialUsername,
  initialAnonymous,
  next,
}: {
  initialUsername: string;
  initialAnonymous: boolean;
  next: string;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [anonymous, setAnonymous] = useState(initialAnonymous);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, is_anonymous: anonymous }),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error);
      return;
    }
    router.push(next);
  }

  return (
    <div className="max-w-sm w-full">
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-lora)] italic text-3xl mb-3">
          Before you wander further —
        </h1>
        <p className="text-[var(--muted)] text-sm leading-relaxed">
          What would you like to be called? Your name appears on traces you leave behind.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username input */}
        <div>
          <input
            type="text"
            value={anonymous ? "" : username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={anonymous}
            placeholder="Choose a name…"
            maxLength={32}
            className="w-full border border-[var(--border)] rounded-full px-4 py-2.5 text-sm bg-transparent focus:outline-none focus:border-[var(--muted)] placeholder:text-[var(--muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {!anonymous && username.length > 0 && (
            <p className="text-[10px] text-[var(--muted)] mt-1.5 px-2 opacity-60">
              {username.length}/32
            </p>
          )}
        </div>

        {/* Anonymous toggle */}
        <button
          type="button"
          onClick={() => setAnonymous((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 border border-[var(--border)] rounded-2xl hover:border-[var(--muted)] transition-colors group"
        >
          <div className="text-left">
            <p className="text-sm">Remain anonymous</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Your traces will show as "a visitor"
            </p>
          </div>
          {/* Toggle pill */}
          <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5 ${
            anonymous ? "bg-[var(--foreground)]" : "bg-[var(--border)]"
          }`}>
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
              anonymous ? "translate-x-4" : "translate-x-0"
            }`} />
          </div>
        </button>

        {error && <p className="text-xs text-red-500 px-1">{error}</p>}

        <button
          type="submit"
          disabled={saving || (!anonymous && !username.trim())}
          className="w-full bg-[var(--foreground)] text-[var(--background)] rounded-full py-2.5 text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
