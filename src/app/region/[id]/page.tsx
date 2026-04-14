import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { REGIONS, findRegionById, findCountryBySlug } from "@/lib/regions";
import type { MuseumObject } from "@/types";
import RegionGrid from "./RegionGrid";

export const revalidate = 300;

export async function generateStaticParams() {
  const continents = REGIONS.map((r) => ({ id: r.id }));
  const countries = REGIONS.flatMap((r) => r.countries.map((c) => ({ id: c.slug })));
  return [...continents, ...countries];
}

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: row.institution as MuseumObject["institution"],
    title: (row.title as string) || "Untitled",
    date: (row.date as string) || "",
    culture: (row.culture as string) || "",
    medium: "",
    imageUrl: (row.image_url as string | null) || null,
    thumbnailUrl: (row.thumbnail_url as string | null) || null,
    imageWidth: (row.image_width as number) || 4,
    imageHeight: (row.image_height as number) || 3,
    department: "",
    artistName: "",
    creditLine: "",
    dimensions: "",
    objectUrl: null,
  };
}

const COLS = "id, institution, title, date, culture, image_url, thumbnail_url, image_width, image_height, year_begin";

export default async function RegionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Determine if this is a continent or country route
  const region = findRegionById(id);
  const country = !region ? findCountryBySlug(id) : undefined;

  if (!region && !country) notFound();

  const supabase = createStaticClient();
  const PAGE = 1000;
  const MAX = 5000;
  const allRows: Record<string, unknown>[] = [];

  for (let page = 0; allRows.length < MAX; page++) {
    let query = supabase
      .from("objects_cache")
      .select(COLS)
      .not("thumbnail_url", "is", null);

    if (region) {
      // Continent-level: all objects for this continent
      query = query.eq("continent", region.id);
    } else if (country) {
      // Country-level: scoped to both continent and country to keep periods separate
      // (e.g. Ottoman Turkey ≠ Ancient Anatolia even though both have country="Turkey")
      query = query.eq("continent", country.continent).eq("country", country.dbValue);
    }

    query = query.order("id").range(page * PAGE, (page + 1) * PAGE - 1);

    const { data, error } = await query;
    if (error) { console.error(`region ${id} page ${page}:`, error.message); break; }
    if (!data || data.length === 0) break;
    allRows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }

  const objects = allRows.map(rowToObject);

  const yearMap: Record<string, number> = {};
  for (const r of allRows) {
    if (r.id && typeof r.year_begin === "number") {
      yearMap[r.id as string] = r.year_begin as number;
    }
  }

  // Breadcrumb and display metadata
  const label = region ? region.label : country!.label;
  const color = region ? region.color : (findRegionById(country!.continent)?.color ?? "#888");
  const parentRegion = country ? findRegionById(country.continent) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        {parentRegion ? (
          <div className="flex items-center gap-1 text-xs text-[var(--muted)] mb-4">
            <Link href="/region" className="hover:text-[var(--foreground)] transition-colors">
              All regions
            </Link>
            <span>›</span>
            <Link href={`/region/${parentRegion.id}`} className="hover:text-[var(--foreground)] transition-colors">
              {parentRegion.label}
            </Link>
          </div>
        ) : (
          <Link
            href="/region"
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 inline-block"
          >
            ← All regions
          </Link>
        )}

        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <h1 className="font-serif italic text-3xl sm:text-4xl">{label}</h1>
        </div>
        <p className="text-sm text-[var(--muted)] mt-2 ml-6">
          {objects.length.toLocaleString()} objects
        </p>
      </div>

      <RegionGrid objects={objects} color={color} yearMap={yearMap} />
    </div>
  );
}
