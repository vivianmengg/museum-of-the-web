import { createClient } from "@/lib/supabase/server";
import { fetchMetObject } from "@/lib/met";
import ExhibitContent from "@/components/ExhibitContent";
import UnpublishButton from "@/components/UnpublishButton";
import ExhibitView from "./ExhibitView";
import type { ExhibitEntry } from "@/components/ExhibitContent";

export default async function ExhibitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Try Supabase first — published exhibits are server-rendered
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const { data } = await supabase
    .from("exhibits")
    .select("*, users(username), exhibit_objects(object_id, institution, curator_note, position)")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (data) {
    // Fetch object data from source APIs in parallel
    const sorted = [...(data.exhibit_objects ?? [])].sort((a, b) => a.position - b.position);
    const fetched = await Promise.all(
      sorted.map(async (eo) => {
        let object = null;
        if (eo.institution === "met") {
          const numericId = parseInt(eo.object_id.replace("met-", ""), 10);
          object = await fetchMetObject(numericId);
        }
        return object ? ({ object, note: eo.curator_note ?? "" } satisfies ExhibitEntry) : null;
      })
    );
    const objects = fetched.filter((e): e is ExhibitEntry => e !== null);

    const isOwner = user?.id === data.user_id;

    return (
      <ExhibitContent
        exhibit={{
          id: data.id,
          title: data.title,
          statement: data.statement ?? "",
          objects,
          savedAt: data.created_at,
          isPublished: true,
          curatorUsername: (data.users as { username: string } | null)?.username,
        }}
        backHref="/"
        backLabel="Browse"
        actions={isOwner ? <UnpublishButton exhibitId={data.id} /> : undefined}
      />
    );
  }

  // Not a published exhibit — try local (client-side localStorage)
  return <ExhibitView id={id} />;
}
