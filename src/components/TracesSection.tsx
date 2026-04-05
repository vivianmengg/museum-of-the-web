"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Trace } from "@/types";

type Props = {
  objectId: string;
  institution: string;
  currentUserId: string | null;
};

export default function TracesSection({ objectId, institution, currentUserId }: Props) {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTraces = useCallback(async () => {
    const res = await fetch(`/api/traces?object_id=${encodeURIComponent(objectId)}`);
    if (res.ok) setTraces(await res.json());
  }, [objectId]);

  useEffect(() => { fetchTraces(); }, [fetchTraces]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object_id: objectId, institution, text }),
    });
    setSubmitting(false);
    if (res.ok) {
      const newTrace = await res.json();
      setTraces((prev) => [newTrace, ...prev]);
      setText("");
    } else {
      const body = await res.json();
      setError(body.error ?? "Something went wrong");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/traces?id=${id}`, { method: "DELETE" });
    if (res.ok) setTraces((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div>
      <h2 className="font-[family-name:var(--font-lora)] italic text-xl mb-1">
        Traces
      </h2>
      <p className="text-[var(--muted)] text-sm mb-6">
        Leave a note — a memory, a feeling, a fact, or what brought you here today.
      </p>

      {/* Compose */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-10">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Something about this caught your eye…"
            maxLength={280}
            rows={3}
            className="w-full border border-[var(--border)] rounded-2xl px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-[var(--muted)] placeholder:text-[var(--muted)] resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[var(--muted)]">{text.length}/280 · ⌘↵ to send</span>
            <button
              type="submit"
              disabled={submitting || !text.trim()}
              className="text-sm px-5 py-1.5 bg-[var(--foreground)] text-[var(--background)] rounded-full hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? "Leaving…" : "Leave trace"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </form>
      ) : (
        <div className="mb-10 py-4 px-5 border border-dashed border-[var(--border)] rounded-2xl text-sm text-[var(--muted)]">
          <Link href="/auth" className="underline underline-offset-2 hover:text-[var(--foreground)] transition-colors">
            Sign in
          </Link>{" "}
          to leave a trace.
        </div>
      )}

      {/* Trace list */}
      {traces.length === 0 ? (
        <p className="text-sm text-[var(--muted)] italic">No traces yet. Be the first.</p>
      ) : (
        <ul className="space-y-6">
          {traces.map((trace) => (
            <li key={trace.id} className="group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">{trace.text}</p>
                  <p className="text-xs text-[var(--muted)] mt-1.5">
                    {trace.users?.is_anonymous ? "a visitor" : (trace.users?.username ?? "a visitor")} ·{" "}
                    {new Date(trace.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {currentUserId === trace.user_id && (
                  <button
                    onClick={() => handleDelete(trace.id)}
                    className="text-xs text-[var(--muted)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete trace"
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
