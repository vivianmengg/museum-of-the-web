import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ExhibitEditor from "./ExhibitEditor";
import type { MuseumObject } from "@/types";
import type { ExhibitEntry } from "@/components/ExhibitContent";

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

export default async function EditExhibitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/auth?next=/exhibit/${id}/edit`);

  const { data } = await supabase
    .from("exhibits")
    .select("*, exhibit_objects(object_id, institution, curator_note, position)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect(`/exhibit/${id}`);

  const sorted = [...(data.exhibit_objects ?? [])].sort((a, b) => a.position - b.position);
  const objectIds = sorted.map((eo) => eo.object_id);

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

  return (
    <ExhibitEditor
      exhibit={{
        id: data.id,
        title: data.title,
        statement: data.statement ?? "",
        objects,
      }}
    />
  );
}
