"use client";

import { useState } from "react";
import Link from "next/link";
import LocalExhibits from "./LocalExhibits";
import FavoritesGrid from "./FavoritesGrid";

type Tab = "exhibits" | "saved";

export default function ExhibitsShell() {
  const [tab, setTab] = useState<Tab>("exhibits");

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-lora)] italic text-4xl mb-1">
            My collection
          </h1>
          <p className="text-[var(--muted)] text-sm">
            Saved locally — will sync to your account once you sign in.
          </p>
        </div>
        <Link
          href="/exhibit/new"
          className="text-sm border border-[var(--border)] px-4 py-1.5 rounded-full hover:border-[var(--muted)] transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          + New exhibit
        </Link>
      </div>

      {/* Tabs */}
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

      {tab === "exhibits" ? <LocalExhibits /> : <FavoritesGrid />}
    </div>
  );
}
