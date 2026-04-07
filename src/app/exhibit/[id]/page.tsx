import { createClient } from "@/lib/supabase/server";
import ExhibitContent from "@/components/ExhibitContent";
import UnpublishButton from "@/components/UnpublishButton";
import ExhibitView from "./ExhibitView";
import type { ExhibitEntry } from "@/components/ExhibitContent";
import type { MuseumObject } from "@/types";

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

export default async function ExhibitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch exhibit — public ones are visible to all, private only to owner
  const { data } = await supabase
    .from("exhibits")
    .select("*, users(username), exhibit_objects(object_id, institution, curator_note, position)")
    .eq("id", id)
    .maybeSingle();

  // Exhibit exists but viewer has no access
  if (data && !data.is_public && user?.id !== data.user_id) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="text-[var(--muted)] mb-2">This exhibit is private.</p>
          <a href="/auth" className="text-sm text-[var(--foreground)] underline underline-offset-2">Sign in</a>
          <span className="text-[var(--muted)] text-sm"> to view your own exhibits.</span>
        </div>
      </div>
    );
  }

  // Show if public, or if the current user owns it
  if (data && (data.is_public || user?.id === data.user_id)) {
    const sorted = [...(data.exhibit_objects ?? [])].sort((a, b) => a.position - b.position);
    const objectIds = sorted.map((eo) => eo.object_id);

    // Batch fetch all objects from cache
    const { data: cachedRows } = await supabase
      .from("objects_cache")
      .select("*")
      .in("id", objectIds);

    const cacheMap = new Map((cachedRows ?? []).map((r) => [r.id as string, r]));

    const objects: ExhibitEntry[] = sorted
      .map((eo) => {
        const row = cacheMap.get(eo.object_id);
        if (!row) return null;
        return { object: rowToObject(row), note: eo.curator_note ?? "" } satisfies ExhibitEntry;
      })
      .filter((e): e is ExhibitEntry => e !== null);

    const isOwner = user?.id === data.user_id;

    return (
      <ExhibitContent
        exhibit={{
          id: data.id,
          title: data.title,
          statement: data.statement ?? "",
          objects,
          savedAt: data.created_at,
          isPublished: data.is_public,
          curatorUsername: (data.users as { username: string } | null)?.username,
        }}
        backHref="/"
        backLabel="Browse"
        actions={isOwner ? (
          <div className="flex items-center gap-6">
            <a
              href={`/exhibit/${data.id}/edit`}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Edit
            </a>
            <UnpublishButton exhibitId={data.id} />
          </div>
        ) : undefined}
      />
    );
  }

  // Not found in Supabase — try local (client-side localStorage)
  return <ExhibitView id={id} />;
}
