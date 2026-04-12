import { createStaticClient } from "@/lib/supabase/static";
import { MEDIUMS } from "@/lib/mediums";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 3600;

async function getMediumPreviews() {
  const supabase = createStaticClient();

  return Promise.all(
    MEDIUMS.map(async (medium) => {
      const orFilter = medium.keywords.map((k) => `medium.ilike.%${k}%`).join(",");
      const { data, count } = await supabase
        .from("objects_cache")
        .select("id, thumbnail_url", { count: "exact" })
        .not("thumbnail_url", "is", null)
        .or(orFilter)
        .limit(4);

      return {
        ...medium,
        count: count ?? 0,
        previews: (data ?? []).map((r) => r.thumbnail_url as string),
      };
    })
  );
}

export default async function MediumPage() {
  const mediums = await getMediumPreviews();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-[family-name:var(--font-lora)] italic text-4xl mb-2">Browse by material</h1>
      <p className="text-sm text-[var(--muted)] mb-10">Explore the collection by what things are made of.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[var(--border)]">
        {mediums.map((medium) => (
          <Link
            key={medium.id}
            href={`/medium/${medium.id}`}
            className="group bg-[var(--background)] flex flex-col hover:bg-[#f5f3ef] transition-colors"
          >
            {/* 4-thumbnail preview grid */}
            <div className="aspect-square grid grid-cols-2 gap-px bg-[var(--border)] overflow-hidden">
              {medium.previews.length > 0
                ? medium.previews.slice(0, 4).map((url, i) => (
                    <div key={i} className="relative bg-[var(--shimmer)] overflow-hidden">
                      <Image src={url} alt="" fill sizes="120px" className="object-cover" unoptimized />
                    </div>
                  ))
                : <div className="col-span-2 row-span-2 bg-[var(--shimmer)]" />
              }
            </div>

            <div className="p-3">
              <p className="text-sm font-medium leading-snug group-hover:opacity-70 transition-opacity">
                {medium.label}
              </p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">
                {medium.count.toLocaleString()} objects
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
