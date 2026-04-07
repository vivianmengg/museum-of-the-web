import { createClient } from "@/lib/supabase/server";
import ExploreShell from "./ExploreShell";
import type { MuseumObject } from "@/types";

export const revalidate = 0; // always fetch fresh data

export type PublicExhibit = {
  id: string;
  title: string;
  statement: string | null;
  created_at: string;
  object_count: number;
  curator: string;
  previews: Array<{ thumbnailUrl: string | null; title: string }>;
};

export default async function ExplorePage() {
  const supabase = await createClient();

  // ── Exhibits ────────────────────────��───────────────────────���─────────────
  const { data: exhibitRows } = await supabase
    .from("exhibits")
    .select("id, title, statement, created_at, user_id, users(username), exhibit_objects(object_id, institution, position)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(40);

  // Collect all preview object IDs across all exhibits
  const previewIds = (exhibitRows ?? []).flatMap((e) =>
    [...(e.exhibit_objects ?? [])]
      .sort((a, b) => a.position - b.position)
      .slice(0, 4)
      .map((eo) => eo.object_id)
  );
  const { data: previewRows } = previewIds.length
    ? await supabase.from("objects_cache").select("id, thumbnail_url, title").in("id", [...new Set(previewIds)])
    : { data: [] };
  const previewMap = new Map((previewRows ?? []).map((r) => [r.id, r]));

  const exhibits: PublicExhibit[] = (exhibitRows ?? []).map((e) => {
    const sorted = [...(e.exhibit_objects ?? [])].sort((a, b) => a.position - b.position);
    const previews = sorted.slice(0, 4).map((eo) => {
      const cached = previewMap.get(eo.object_id);
      return { thumbnailUrl: cached?.thumbnail_url ?? null, title: cached?.title ?? "" };
    });
    return {
      id: e.id,
      title: e.title,
      statement: e.statement ?? null,
      created_at: e.created_at,
      object_count: e.exhibit_objects?.length ?? 0,
      curator: (Array.isArray(e.users) ? e.users[0] : e.users as { username: string } | null)?.username ?? "anonymous",
      previews,
    };
  });

  // ── Artifacts ─────────────────────────────────────────────────────────────
  // Two signals merged: recently traced objects + objects in recently published exhibits
  // Each carries a `last_seen` timestamp so we can sort by recency after deduping

  const [{ data: traceRows }, { data: eoRows }] = await Promise.all([
    // Signal 1: objects with recent traces
    supabase
      .from("traces")
      .select("object_id, institution, created_at")
      .order("created_at", { ascending: false })
      .limit(60),

    // Signal 2: objects from recently published exhibits
    supabase
      .from("exhibit_objects")
      .select("object_id, institution, exhibits!inner(is_public, created_at)")
      .eq("exhibits.is_public", true)
      .order("exhibits(created_at)", { ascending: false })
      .limit(80),
  ]);

  // Merge into a map keyed by object_id, keeping the most recent timestamp
  const objectMap = new Map<string, { object_id: string; institution: string; last_seen: string }>();

  for (const r of traceRows ?? []) {
    const existing = objectMap.get(r.object_id);
    if (!existing || r.created_at > existing.last_seen) {
      objectMap.set(r.object_id, { object_id: r.object_id, institution: r.institution, last_seen: r.created_at });
    }
  }

  for (const r of eoRows ?? []) {
    const exhibitDate = (Array.isArray(r.exhibits) ? r.exhibits[0] : r.exhibits as { created_at: string } | null)?.created_at ?? "";
    const existing = objectMap.get(r.object_id);
    if (!existing || exhibitDate > existing.last_seen) {
      objectMap.set(r.object_id, { object_id: r.object_id, institution: r.institution, last_seen: exhibitDate });
    }
  }

  // Sort by most recently surfaced, cap at 32
  const sorted = [...objectMap.values()]
    .sort((a, b) => b.last_seen.localeCompare(a.last_seen))
    .slice(0, 32);

  const artifactIds = sorted.map((r) => r.object_id);
  const { data: artifactRows } = artifactIds.length
    ? await supabase.from("objects_cache").select("*").in("id", artifactIds)
    : { data: [] };
  const artifactCacheMap = new Map((artifactRows ?? []).map((r) => [r.id, r]));

  const artifacts: MuseumObject[] = sorted.flatMap((r) => {
    const row = artifactCacheMap.get(r.object_id);
    if (!row) return [];
    return [{
      id:           row.id,
      institution:  row.institution,
      title:        row.title || "Untitled",
      date:         row.date || "",
      culture:      row.culture || "",
      medium:       row.medium || "",
      imageUrl:     row.image_url ?? null,
      thumbnailUrl: row.thumbnail_url ?? null,
      imageWidth:   row.image_width || 4,
      imageHeight:  row.image_height || 3,
      department:   row.department || "",
      artistName:   row.artist_name || "",
      creditLine:   row.credit_line || "",
      dimensions:   row.dimensions || "",
      objectUrl:    row.object_url ?? null,
    }];
  });

  return <ExploreShell exhibits={exhibits} artifacts={artifacts} />;
}
