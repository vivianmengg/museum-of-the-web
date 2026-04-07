import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CIVILIZATIONS, matchesCiv } from "@/app/timeline/page";
import type { MuseumObject } from "@/types";

export const revalidate = 3600;

export async function generateStaticParams() {
  return CIVILIZATIONS.map((c) => ({ id: c.id }));
}

function rowToMuseumObject(row: Record<string, unknown>): MuseumObject {
  return {
    id:           row.id as string,
    institution:  row.institution as "met" | "aic" | "rijks" | "moma",
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

export default async function RegionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const civ = CIVILIZATIONS.find((c) => c.id === id);
  if (!civ) notFound();

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("objects_cache")
    .select("*")
    .not("thumbnail_url", "is", null)
    .limit(8000);

  const objects: MuseumObject[] = [];
  for (const row of rows ?? []) {
    if (matchesCiv(row as Record<string, unknown>, civ)) {
      objects.push(rowToMuseumObject(row as Record<string, unknown>));
    }
  }

  // Sort by year_begin if available
  objects.sort((a, b) => {
    const ya = (rows?.find(r => r.id === a.id) as Record<string, unknown>)?.year_begin as number | null;
    const yb = (rows?.find(r => r.id === b.id) as Record<string, unknown>)?.year_begin as number | null;
    if (ya != null && yb != null) return ya - yb;
    if (ya != null) return -1;
    if (yb != null) return 1;
    return 0;
  });

  return (
    <main className="max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="mb-10">
        <Link href="/region" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors mb-4 inline-block">
          ← All regions
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: civ.color }} />
          <h1 className="font-[family-name:var(--font-lora)] italic text-4xl">{civ.label}</h1>
        </div>
        <p className="text-[var(--muted)] text-sm mt-2">{objects.length.toLocaleString()} objects in the collection</p>
      </div>

      {objects.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">No objects found for this region yet.</p>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {objects.map((obj) => (
            <Link
              key={obj.id}
              href={`/object/${obj.id}`}
              className="group flex flex-col rounded-lg overflow-hidden border border-[var(--border)] hover:border-[var(--muted)] transition-colors bg-white"
            >
              <div className="aspect-square overflow-hidden bg-[var(--border)]/30">
                {obj.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={obj.thumbnailUrl}
                    alt={obj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full" style={{ backgroundColor: civ.color + "22" }} />
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-xs font-medium text-[var(--foreground)] line-clamp-2 leading-snug">{obj.title}</p>
                {obj.date && <p className="text-[10px] text-[var(--muted)] mt-0.5">{obj.date}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
