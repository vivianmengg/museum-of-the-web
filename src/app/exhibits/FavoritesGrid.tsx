"use client";

import Link from "next/link";
import ObjectCard from "@/components/ObjectCard";
import { useFavorites } from "@/lib/useFavorites";

export default function FavoritesGrid() {
  const { favorites, ready } = useFavorites();

  if (!ready) {
    return <div className="py-16 text-center text-sm text-[var(--muted)] animate-pulse">Loading…</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--muted)] mb-6">No saved objects yet.</p>
        <Link
          href="/"
          className="text-sm border border-[var(--border)] px-5 py-2 rounded-full hover:border-[var(--muted)] transition-colors"
        >
          Browse collection
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-[var(--muted)] mb-4">{favorites.length} saved</p>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-1">
        {favorites.map((obj) => (
          <div key={obj.id} className="mb-1">
            <ObjectCard object={obj} />
          </div>
        ))}
      </div>
    </div>
  );
}
