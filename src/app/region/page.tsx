import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { REGIONS } from "@/lib/regions";

export const revalidate = 3600;

async function fetchRegionPreviews() {
  const supabase = createStaticClient();

  const results = [];
  for (const region of REGIONS) {
    const { data } = await supabase
      .from("objects_cache")
      .select("thumbnail_url")
      .eq("continent", region.id)
      .not("thumbnail_url", "is", null)
      .limit(1);

    results.push({
      ...region,
      thumbnail: data?.[0]?.thumbnail_url ?? null,
    });
  }
  return results;
}

export default async function RegionPage() {
  const regions = await fetchRegionPreviews();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif italic text-3xl sm:text-4xl mb-2">Browse by region</h1>
      <p className="text-sm text-[var(--muted)] mb-10">Explore art and artifacts from civilizations across time.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {regions.map(({ id, label, color, thumbnail }) => (
          <Link
            key={id}
            href={`/region/${id}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
          >
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnail}
                alt={label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: color + "33" }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-white text-sm font-medium leading-snug">{label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
