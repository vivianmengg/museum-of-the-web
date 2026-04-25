import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { MEDIUMS } from "@/lib/mediums";
import type { MuseumObject } from "@/types";
import RegionGrid from "@/app/region/[id]/RegionGrid";

export const revalidate = 86400;

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

export default async function MediumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const medium = MEDIUMS.find((m) => m.id === id);
  if (!medium) notFound();

  const supabase = createStaticClient();
  // Only fetch columns needed for the grid — omit long fields (medium, credit_line, etc.)
  // to keep the ISR payload well under Vercel's 19MB limit at 5000 objects.
  const COLS = "id, institution, title, date, culture, image_url, thumbnail_url, image_width, image_height, year_begin";

  const PAGE = 1000;
  const MAX = 5000;
  const allRows: Record<string, unknown>[] = [];
  for (let page = 0; allRows.length < MAX; page++) {
    const { data, error } = await supabase
      .from("objects_cache")
      .select(COLS)
      .not("thumbnail_url", "is", null)
      .eq("material", id)
      .order("id")
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

      <RegionGrid
        objects={objects}
        color={medium.color}
        yearMap={yearMap}
        minYear={id === "photography" ? 1800 : undefined}
        maxYear={id === "photography" ? 2026 : undefined}
      />
    </div>
  );
}
