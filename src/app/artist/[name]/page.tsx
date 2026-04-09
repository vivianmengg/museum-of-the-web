import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import type { MuseumObject } from "@/types";
import ArtistGrid from "./ArtistGrid";

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id:           row.id as string,
    institution:  row.institution as MuseumObject["institution"],
    title:        (row.title as string) || "Untitled",
    date:         (row.date as string) || "",
    culture:      (row.culture as string) || "",
    medium:       (row.medium as string) || "",
    imageUrl:     (row.image_url as string | null) || null,
    thumbnailUrl: (row.thumbnail_url as string | null) || null,
    imageWidth:   (row.image_width as number) || 4,
    imageHeight:  (row.image_height as number) || 3,
    department:   (row.department as string) || "",
    artistName:   (row.artist_name as string) || "",
    creditLine:   (row.credit_line as string) || "",
    dimensions:   (row.dimensions as string) || "",
    objectUrl:    (row.object_url as string | null) || null,
  };
}

const PAGE_SIZE = 200;

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const artistName = decodeURIComponent(name);

  const supabase = createStaticClient();
  const { data, count } = await supabase
    .from("objects_cache")
    .select("*", { count: "exact" })
    .eq("artist_name", artistName)
    .not("thumbnail_url", "is", null)
    .order("date")
    .range(0, PAGE_SIZE - 1);

  const objects = (data ?? []).map(rowToObject);
  const total = count ?? 0;

  const displayName =
    objects[0]?.artistName ?? artistName;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-8 block"
      >
        ← Browse
      </Link>

      <h1 className="font-[family-name:var(--font-lora)] italic text-3xl sm:text-4xl leading-snug mb-1">
        {displayName}
      </h1>
      <p className="text-xs text-[var(--muted)] mb-10">
        {total.toLocaleString()} work{total !== 1 ? "s" : ""} in the collection
      </p>

      {total === 0 ? (
        <p className="text-[var(--muted)] text-sm">No works found for this artist.</p>
      ) : (
        <ArtistGrid artistName={artistName} initialObjects={objects} total={total} />
      )}
    </div>
  );
}
