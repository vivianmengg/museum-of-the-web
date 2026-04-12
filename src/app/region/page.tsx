import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { CIVILIZATIONS, matchesCiv } from "@/app/timeline/page";

export const revalidate = 3600;

async function fetchCivThumbnail(civId: string): Promise<string | null> {
  const civ = CIVILIZATIONS.find((c) => c.id === civId);
  if (!civ) return null;
  const supabase = createStaticClient();

  const deptFilter = civ.deptMatch[0];
  let query = supabase
    .from("objects_cache")
    .select("thumbnail_url, department, culture")
    .not("thumbnail_url", "is", null)
    .ilike("department", `%${deptFilter}%`)
    .limit(50);

  if (civ.cultureMatch) {
    query = query.ilike("culture", `%${civ.cultureMatch[0]}%`);
  }

  const { data } = await query;
  if (!data) return null;

  const match = data.find((r) =>
    matchesCiv(r as Record<string, unknown>, civ)
  );
  return match?.thumbnail_url ?? data[0]?.thumbnail_url ?? null;
}

export default async function RegionPage() {
  const thumbnails = await Promise.all(
    CIVILIZATIONS.map(async (civ) => ({
      civ,
      thumbnail: await fetchCivThumbnail(civ.id),
    }))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif italic text-3xl sm:text-4xl mb-2">Browse by region</h1>
      <p className="text-sm text-[var(--muted)] mb-10">Explore art and artifacts from civilizations across time.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {thumbnails.map(({ civ, thumbnail }) => (
          <Link
            key={civ.id}
            href={`/region/${civ.id}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
          >
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={civ.label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: civ.color + "33" }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="w-2 h-2 rounded-full mb-1.5" style={{ backgroundColor: civ.color }} />
              <p className="text-white text-sm font-medium leading-snug">{civ.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
