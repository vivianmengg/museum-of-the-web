import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { REGIONS } from "@/lib/regions";
import type { RegionCountry } from "@/lib/regions";

export const revalidate = 86400;

async function fetchThumbnails(): Promise<Record<string, string | null>> {
  const supabase = createStaticClient();
  const out: Record<string, string | null> = {};

  // Fetch one thumbnail per continent and per country in parallel
  const continentQueries = REGIONS.map(async (region) => {
    const { data } = await supabase
      .from("objects_cache")
      .select("thumbnail_url")
      .eq("continent", region.id)
      .not("thumbnail_url", "is", null)
      .limit(1);
    out[region.id] = data?.[0]?.thumbnail_url ?? null;
  });

  const countryQueries = REGIONS.flatMap((region) =>
    region.countries.map(async (country) => {
      const { data } = await supabase
        .from("objects_cache")
        .select("thumbnail_url")
        .eq("continent", country.continent)
        .eq("country", country.dbValue)
        .not("thumbnail_url", "is", null)
        .limit(1);
      out[country.slug] = data?.[0]?.thumbnail_url ?? null;
    })
  );

  await Promise.all([...continentQueries, ...countryQueries]);
  return out;
}

function CountryCard({ country, thumbnail }: { country: RegionCountry; thumbnail: string | null }) {
  return (
    <Link
      href={`/region/${country.slug}`}
      className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt={country.label}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-[var(--shimmer)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-sm font-medium leading-snug">{country.label}</p>
      </div>
    </Link>
  );
}

export default async function RegionPage() {
  const thumbnails = await fetchThumbnails();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif italic text-3xl sm:text-4xl mb-2">Browse by region</h1>
      <p className="text-sm text-[var(--muted)] mb-10">Explore art and artifacts from civilizations across time.</p>

      <div className="space-y-12">
        {REGIONS.map((region) => (
          <section key={region.id}>
            {/* Continent header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: region.color }} />
                <h2 className="font-serif italic text-xl">{region.label}</h2>
              </div>
              <Link
                href={`/region/${region.id}`}
                className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                See all →
              </Link>
            </div>

            {/* Country grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
              {region.countries.map((country) => (
                <CountryCard
                  key={country.slug}
                  country={country}
                  thumbnail={thumbnails[country.slug] ?? null}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
