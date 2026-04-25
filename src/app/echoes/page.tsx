import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { institutionShortName } from "@/lib/institutions";

type Cluster = {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  objects: ObjectRow[];
};

type ObjectRow = {
  id: string;
  institution: string;
  title: string;
  artist_name: string | null;
  culture: string | null;
  date: string | null;
  thumbnail_url: string | null;
  object_url: string | null;
};

async function getClusters(): Promise<Cluster[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await supabase
    .from("echo_clusters")
    .select("slug, title, subtitle, description, object_ids")
    .order("created_at");

  if (error || !rows?.length) return [];

  // Fetch all objects in one query
  const allIds = rows.flatMap((r) => r.object_ids as string[]);
  const { data: objects } = await supabase
    .from("objects_cache")
    .select("id, institution, title, artist_name, culture, date, thumbnail_url, object_url")
    .in("id", allIds)
    .not("thumbnail_url", "is", null);

  const objectMap = new Map((objects ?? []).map((o) => [o.id, o]));

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    objects: (row.object_ids as string[])
      .map((id) => objectMap.get(id))
      .filter(Boolean) as ObjectRow[],
  })).filter((c) => c.objects.length >= 2);
}

function ObjectCard({ obj }: { obj: ObjectRow }) {
  return (
    <Link href={`/object/${obj.id}`} className="group block space-y-2">
      <div
        className="relative aspect-square overflow-hidden rounded-sm"
        style={{ background: "var(--border)" }}
      >
        {obj.thumbnail_url && (
          <Image
            src={obj.thumbnail_url}
            alt={obj.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="200px"
          />
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-serif italic leading-snug line-clamp-2 group-hover:underline underline-offset-2">
          {obj.title}
        </p>
        <p className="text-xs text-muted line-clamp-1">
          {[obj.culture, obj.date].filter(Boolean).join(" · ")}
        </p>
        <p className="text-xs uppercase tracking-wider" style={{ color: "var(--accent)" }}>
          {institutionShortName(obj.institution)}
        </p>
      </div>
    </Link>
  );
}

function ClusterSection({ cluster, index }: { cluster: Cluster; index: number }) {
  const isEven = index % 2 === 0;

  return (
    <section
      className="py-16"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Editorial text — alternates left/right */}
        <div className={`space-y-4 ${isEven ? "md:order-1" : "md:order-2"}`}>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-muted">{cluster.subtitle}</p>
            <h2 className="font-serif text-3xl italic">{cluster.title}</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted max-w-sm">
            {cluster.description}
          </p>
        </div>

        {/* Object grid */}
        <div className={`${isEven ? "md:order-2" : "md:order-1"}`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {cluster.objects.slice(0, 8).map((obj) => (
              <ObjectCard key={obj.id} obj={obj} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function EchoesPage() {
  const clusters = await getClusters();

  return (
    <main className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-6xl mx-auto px-4 py-16">
        <header className="mb-4 max-w-xl">
          <p className="text-xs uppercase tracking-widest text-muted mb-2">Cross-cultural resonance</p>
          <h1 className="font-serif text-5xl italic mb-4">Echoes</h1>
          <p className="text-muted leading-relaxed">
            The same ideas — a form, a motif, a material — appeared across civilizations that never met,
            or traveled slowly through centuries of trade and exchange. These are the resonances.
          </p>
        </header>

        {clusters.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <p className="font-serif italic text-2xl text-muted">No clusters yet</p>
            <p className="text-sm text-muted">
              Run <code className="text-xs bg-border px-1 py-0.5 rounded">node scripts/curate-echoes.mjs</code> to generate them.
            </p>
          </div>
        ) : (
          <div>
            {clusters.map((cluster, i) => (
              <ClusterSection key={cluster.slug} cluster={cluster} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
