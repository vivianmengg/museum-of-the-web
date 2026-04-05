import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type Tab = "traces" | "exhibits";

// ── Traces tab ────────────────────────────────────────────────────────────────

async function TracesTab({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: traces } = await supabase
    .from("traces")
    .select("id, object_id, text, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const objectIds = [...new Set((traces ?? []).map((t) => t.object_id))];
  let artworkMap = new Map<string, Record<string, unknown>>();
  if (objectIds.length > 0) {
    const { data: artworks } = await supabase
      .from("objects_cache")
      .select("id, title, artist_name, date, thumbnail_url, image_width, image_height")
      .in("id", objectIds);
    artworkMap = new Map((artworks ?? []).map((a) => [a.id as string, a]));
  }

  if ((traces ?? []).length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] italic py-6">No traces left yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {(traces ?? []).map((trace) => {
        const art = artworkMap.get(trace.object_id);
        const thumbUrl = art?.thumbnail_url as string | null;
        const imgW = (art?.image_width as number) || 4;
        const imgH = (art?.image_height as number) || 3;
        const aspect = Math.min(1.6, Math.max(0.6, imgW / imgH));
        const thumbH = Math.round(64 / aspect);

        return (
          <li key={trace.id} className="py-5">
            <Link href={`/object/${trace.object_id}`} className="flex gap-4 group">
              <div
                className="flex-shrink-0 bg-[#d8d4cc] overflow-hidden rounded-sm"
                style={{ width: 64, height: thumbH }}
              >
                {thumbUrl && (
                  <Image
                    src={thumbUrl}
                    alt={(art?.title as string) || ""}
                    width={64}
                    height={thumbH}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug group-hover:underline underline-offset-2 line-clamp-1">
                  {(art?.title as string) || trace.object_id}
                </p>
                {art?.artist_name && (
                  <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">
                    {art.artist_name as string}
                    {art.date ? ` · ${art.date}` : ""}
                  </p>
                )}
                <p className="text-sm italic text-[var(--foreground)]/80 mt-2 leading-relaxed">
                  &ldquo;{trace.text}&rdquo;
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-1.5">
                  {new Date(trace.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ── Exhibits tab ──────────────────────────────────────────────────────────────

async function ExhibitsTab({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: exhibits } = await supabase
    .from("exhibits")
    .select("id, title, statement, is_public, created_at, exhibit_objects(object_id, position)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if ((exhibits ?? []).length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] italic py-6">No exhibits yet.</p>
    );
  }

  // Collect all object IDs needed for preview thumbnails (first 4 per exhibit)
  const previewIds = [
    ...new Set(
      (exhibits ?? []).flatMap((e) =>
        (e.exhibit_objects as { object_id: string; position: number }[])
          .sort((a, b) => a.position - b.position)
          .slice(0, 4)
          .map((o) => o.object_id)
      )
    ),
  ];

  let thumbMap = new Map<string, string | null>();
  if (previewIds.length > 0) {
    const { data: artworks } = await supabase
      .from("objects_cache")
      .select("id, thumbnail_url")
      .in("id", previewIds);
    thumbMap = new Map((artworks ?? []).map((a) => [a.id as string, a.thumbnail_url as string | null]));
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {(exhibits ?? []).map((exhibit) => {
        const sorted = (exhibit.exhibit_objects as { object_id: string; position: number }[])
          .sort((a, b) => a.position - b.position);
        const previews = sorted.slice(0, 4).map((o) => thumbMap.get(o.object_id) ?? null);

        return (
          <li key={exhibit.id} className="py-5">
            <Link href={`/exhibit/${exhibit.id}`} className="flex gap-4 group">
              {/* 4-cell thumbnail strip */}
              <div className="flex-shrink-0 flex gap-0.5 h-16 w-[138px]">
                {previews.length > 0 ? previews.map((url, i) => (
                  <div key={i} className="flex-1 bg-[#d8d4cc] overflow-hidden rounded-sm">
                    {url && (
                      <Image
                        src={url}
                        alt=""
                        width={32}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    )}
                  </div>
                )) : (
                  <div className="w-full bg-[#d8d4cc] rounded-sm" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug group-hover:underline underline-offset-2 line-clamp-1">
                  {exhibit.title}
                </p>
                {exhibit.statement && (
                  <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2 leading-relaxed">
                    {exhibit.statement}
                  </p>
                )}
                <p className="text-[10px] text-[var(--muted)] mt-2">
                  {sorted.length} {sorted.length === 1 ? "object" : "objects"} ·{" "}
                  {exhibit.is_public ? "Public" : "Private"} ·{" "}
                  {new Date(exhibit.created_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "exhibits" ? "exhibits" : "traces";

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("id, username, is_anonymous, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === id;

  const displayName = profile.is_anonymous ? "a visitor" : (profile.username || "visitor");

  function tabClass(t: Tab) {
    return `px-4 py-2 text-sm transition-colors relative ${
      tab === t
        ? "text-[var(--foreground)]"
        : "text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-lora)] italic text-3xl mb-1">
            {displayName}
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Wandering since{" "}
            {new Date(profile.created_at).toLocaleDateString("en-US", {
              month: "long", year: "numeric",
            })}
          </p>
        </div>
        {isOwnProfile && (
          <Link
            href="/setup"
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors border border-[var(--border)] rounded-full px-3 py-1.5"
          >
            Settings
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[var(--border)]">
        <Link href={`/profile/${id}?tab=traces`} className={tabClass("traces")}>
          Traces
          {tab === "traces" && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--foreground)]" />
          )}
        </Link>
        <Link href={`/profile/${id}?tab=exhibits`} className={tabClass("exhibits")}>
          Exhibits
          {tab === "exhibits" && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--foreground)]" />
          )}
        </Link>
      </div>

      {/* Tab content */}
      {tab === "traces"
        ? <TracesTab userId={id} />
        : <ExhibitsTab userId={id} />
      }
    </div>
  );
}
