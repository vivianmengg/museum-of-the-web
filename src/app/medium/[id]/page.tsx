import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { MEDIUMS } from "@/lib/mediums";
import type { MuseumObject } from "@/types";
import RegionGrid from "@/app/region/[id]/RegionGrid";

export const revalidate = 3600;

export async function generateStaticParams() {
  return MEDIUMS.map((m) => ({ id: m.id }));
}

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: row.institution as MuseumObject["institution"],
    title: (row.title as string) || "Untitled",
    date: (row.date as string) || "",
    culture: (row.culture as string) || "",
    medium: (row.medium as string) || "",
    imageUrl: (row.image_url as string | null) || null,
    thumbnailUrl: (row.thumbnail_url as string | null) || null,
    imageWidth: (row.image_width as number) || 4,
    imageHeight: (row.image_height as number) || 3,
    department: (row.department as string) || "",
    artistName: (row.artist_name as string) || "",
    creditLine: (row.credit_line as string) || "",
    dimensions: (row.dimensions as string) || "",
    objectUrl: (row.object_url as string | null) || null,
  };
}

export default async function MediumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const medium = MEDIUMS.find((m) => m.id === id);
  if (!medium) notFound();

  const supabase = createStaticClient();
  const COLS = "id, institution, title, date, culture, medium, image_url, thumbnail_url, image_width, image_height, department, artist_name, credit_line, dimensions, object_url, year_begin";

  const PAGE = 1000;
  const allRows: Record<string, unknown>[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from("objects_cache")
      .select(COLS)
      .not("thumbnail_url", "is", null)
      .eq("material", id)
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) { console.error(`medium ${id} page ${page}:`, error.message); break; }
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <Link
          href="/medium"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 inline-block"
        >
          ← All materials
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: medium.color }} />
          <h1 className="font-serif italic text-3xl sm:text-4xl">{medium.label}</h1>
        </div>
        <p className="text-sm text-[var(--muted)] mt-2 ml-6">
          {objects.length.toLocaleString()} objects
        </p>
      </div>

      <RegionGrid objects={objects} color={medium.color} yearMap={yearMap} />
    </div>
  );
}
