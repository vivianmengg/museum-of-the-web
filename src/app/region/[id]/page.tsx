import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { CIVILIZATIONS, matchesCiv } from "@/app/timeline/page";
import type { MuseumObject } from "@/types";
import RegionGrid from "./RegionGrid";

export const revalidate = 3600;

export async function generateStaticParams() {
  return CIVILIZATIONS.map((c) => ({ id: c.id }));
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

export default async function RegionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const civ = CIVILIZATIONS.find((c) => c.id === id);
  if (!civ) notFound();

  const supabase = createStaticClient();

  const deptFilter = civ.deptMatch[0];
  let query = supabase
    .from("objects_cache")
    .select("*")
    .not("thumbnail_url", "is", null)
    .ilike("department", `%${deptFilter}%`);

  // For civs with a culture list, filter at the DB level so we don't waste
  // the row budget on the wrong cultures (e.g. fetching all of Asian Art
  // just to find Chinese objects).
  if (civ.cultureMatch && civ.cultureMatch.length > 0) {
    query = query.or(civ.cultureMatch.map((c) => `culture.ilike.%${c}%`).join(","));
  }

  const { data: rows } = await query.limit(1500);

  const allRows = (rows ?? []) as Record<string, unknown>[];
  const matched = allRows.filter((r) => matchesCiv(r, civ)).map(rowToObject);

  // Build year map for client-side scrubber
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
          href="/region"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 inline-block"
        >
          ← All regions
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: civ.color }} />
          <h1 className="font-serif italic text-3xl sm:text-4xl">{civ.label}</h1>
        </div>
        <p className="text-sm text-[var(--muted)] mt-2 ml-6">
          {matched.length.toLocaleString()} objects
        </p>
      </div>

      <RegionGrid objects={matched} color={civ.color} yearMap={yearMap} />
    </div>
  );
}
