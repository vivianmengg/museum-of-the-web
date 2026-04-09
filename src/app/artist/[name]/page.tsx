import Link from "next/link";
import Image from "next/image";
import { createStaticClient } from "@/lib/supabase/static";
import type { MuseumObject } from "@/types";

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

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const artistName = decodeURIComponent(name);

  const supabase = createStaticClient();
  const { data } = await supabase
    .from("objects_cache")
    .select("*")
    .eq("artist_name", artistName)
    .not("thumbnail_url", "is", null)
    .order("date")
    .limit(200);

  const objects = (data ?? []).map(rowToObject);

  // Use the first exact-ish match as the canonical display name
  const displayName =
    objects.find((o) => o.artistName.toLowerCase() === artistName.toLowerCase())?.artistName
    ?? objects[0]?.artistName
    ?? artistName;

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
        {objects.length} work{objects.length !== 1 ? "s" : ""} in the collection
      </p>

      {objects.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">No works found for this artist.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {objects.map((obj) => (
            <Link
              key={obj.id}
              href={`/object/${obj.id}`}
              className="block group relative aspect-square overflow-hidden rounded-md bg-[var(--border)]/20"
            >
              {obj.thumbnailUrl && (
                <Image
                  src={obj.thumbnailUrl}
                  alt={obj.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-cover"
                  unoptimized
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white text-xs leading-snug line-clamp-2">{obj.title}</p>
                {obj.date && <p className="text-white/70 text-[10px] mt-0.5">{obj.date}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
