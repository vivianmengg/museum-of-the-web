import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CIVILIZATIONS, matchesCiv } from "@/app/timeline/page";
import type { Civilization } from "@/app/timeline/page";

export const revalidate = 3600;

export default async function RegionPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("objects_cache")
    .select("id, thumbnail_url, department, culture")
    .not("thumbnail_url", "is", null)
    .limit(8000);

  // Group thumbnails by civ
  const civThumbs = new Map<string, string[]>();
  const civCounts = new Map<string, number>();
  for (const civ of CIVILIZATIONS) {
    civThumbs.set(civ.id, []);
    civCounts.set(civ.id, 0);
  }

  for (const row of rows ?? []) {
    for (const civ of CIVILIZATIONS) {
      if (!matchesCiv(row as Record<string, unknown>, civ)) continue;
      civCounts.set(civ.id, (civCounts.get(civ.id) ?? 0) + 1);
      const thumbs = civThumbs.get(civ.id)!;
      if (thumbs.length < 6) thumbs.push(row.thumbnail_url!);
      break;
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-20">
      <h1 className="font-[family-name:var(--font-lora)] italic text-4xl mb-2">Browse by region</h1>
      <p className="text-[var(--muted)] text-sm mb-10">Explore the collection through the lens of world civilizations.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CIVILIZATIONS.map((civ) => (
          <CivCard
            key={civ.id}
            civ={civ}
            thumbnails={civThumbs.get(civ.id) ?? []}
            count={civCounts.get(civ.id) ?? 0}
          />
        ))}
      </div>
    </main>
  );
}

function CivCard({ civ, thumbnails, count }: { civ: Civilization; thumbnails: string[]; count: number }) {
  return (
    <Link
      href={`/region/${civ.id}`}
      className="group border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--muted)] transition-colors bg-white"
    >
      {/* Thumbnail mosaic */}
      <div className="grid grid-cols-3 h-32 overflow-hidden">
        {thumbnails.slice(0, 6).map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={url} alt="" className="w-full h-full object-cover" />
        ))}
        {Array.from({ length: Math.max(0, 6 - thumbnails.length) }).map((_, i) => (
          <div key={`empty-${i}`} style={{ backgroundColor: civ.color + "22" }} />
        ))}
      </div>

      {/* Label */}
      <div className="px-4 py-3 flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: civ.color }} />
        <div className="flex-1 min-w-0">
          <p className="font-[family-name:var(--font-lora)] italic text-base leading-snug">{civ.label}</p>
          {count > 0 && (
            <p className="text-xs text-[var(--muted)]">{count.toLocaleString()} objects</p>
          )}
        </div>
        <svg className="text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  );
}
