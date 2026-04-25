import Link from "next/link";
import { createStaticClient } from "@/lib/supabase/static";
import { INSTITUTIONS } from "@/lib/institutions";

export const revalidate = 86400;

async function fetchInstitutionPreviews(): Promise<Record<string, { thumbnails: string[]; count: number }>> {
  const supabase = createStaticClient();
  const out: Record<string, { thumbnails: string[]; count: number }> = {};

  await Promise.all(
    INSTITUTIONS.map(async (inst) => {
      const { data } = await supabase
        .from("objects_cache")
        .select("thumbnail_url")
        .eq("institution", inst.id)
        .not("thumbnail_url", "is", null)
        .limit(4);

      // Get count separately
      let count = 0;
      let page = 0;
      while (true) {
        const { data: rows } = await supabase
          .from("objects_cache")
          .select("id")
          .eq("institution", inst.id)
          .range(page * 1000, page * 1000 + 999);
        count += rows?.length ?? 0;
        if (!rows || rows.length < 1000) break;
        page++;
      }

      out[inst.id] = {
        thumbnails: (data ?? []).map((r) => r.thumbnail_url).filter(Boolean) as string[],
        count,
      };
    })
  );

  return out;
}

export default async function InstitutionIndexPage() {
  const previews = await fetchInstitutionPreviews();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-serif italic text-3xl sm:text-4xl mb-2">Browse by institution</h1>
      <p className="text-sm text-[var(--muted)] mb-10">
        Explore collections from museums and cultural foundations around the world.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INSTITUTIONS.map((inst) => {
          const preview = previews[inst.id] ?? { thumbnails: [], count: 0 };
          return (
            <Link
              key={inst.id}
              href={`/institution/${inst.id}`}
              className="group flex gap-4 p-4 rounded-xl border border-[var(--border)] hover:border-[var(--muted)] transition-colors bg-[var(--background)]"
            >
              {/* Thumbnail mosaic */}
              <div className="shrink-0 grid grid-cols-2 gap-0.5 w-20 h-20 rounded-lg overflow-hidden">
                {[0, 1, 2, 3].map((i) =>
                  preview.thumbnails[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={preview.thumbnails[i]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div key={i} className="w-full h-full" style={{ backgroundColor: inst.color + "33" }} />
                  )
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: inst.color }} />
                    {!inst.claimed && (
                      <span className="text-[9px] text-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded-full">
                        unclaimed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)] leading-snug group-hover:text-[var(--foreground)] line-clamp-2">
                    {inst.label}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{inst.location}</p>
                </div>
                <p className="text-xs text-[var(--muted)] opacity-60">
                  {preview.count.toLocaleString()} objects
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
