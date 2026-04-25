import { notFound } from "next/navigation";
import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { INSTITUTIONS, findInstitutionById } from "@/lib/institutions";
import type { MuseumObject } from "@/types";
import InstitutionPage from "./InstitutionPage";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return INSTITUTIONS.map((i) => ({ id: i.id }));
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

const COLS = "id, institution, title, date, culture, medium, image_url, thumbnail_url, image_width, image_height, department, artist_name, credit_line, dimensions, object_url";

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const institution = findInstitutionById(id);
  if (!institution) notFound();

  const supabase = createStaticClient();

  // Fetch highlights: 12 objects with images
  const { data: highlightRows } = await supabase
    .from("objects_cache")
    .select(COLS)
    .eq("institution", id)
    .not("thumbnail_url", "is", null)
    .limit(48);

  // Shuffle highlights to get variety
  const shuffled = [...(highlightRows ?? [])];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const highlights = shuffled.slice(0, 12).map(rowToObject);

  // Fetch full collection (up to 2000 for the grid)
  const PAGE = 1000;
  const allRows: Record<string, unknown>[] = [];
  for (let page = 0; allRows.length < 2000; page++) {
    const { data, error } = await supabase
      .from("objects_cache")
      .select(COLS)
      .eq("institution", id)
      .not("thumbnail_url", "is", null)
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error || !data || data.length === 0) break;
    allRows.push(...(data as Record<string, unknown>[]));
    if (data.length < PAGE) break;
  }

  // Shuffle collection too
  for (let i = allRows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allRows[i], allRows[j]] = [allRows[j], allRows[i]];
  }

  const objects = allRows.map(rowToObject);
  const totalCount = allRows.length;

  return (
    <InstitutionPage
      institution={institution}
      highlights={highlights}
      objects={objects}
      totalCount={totalCount}
    />
  );
}
