import { notFound } from "next/navigation";
import { fetchMetObject } from "@/lib/met";
import { fetchAicObject } from "@/lib/aic";
import { fetchRijksObject } from "@/lib/rijks";
import { createClient } from "@/lib/supabase/server";
import type { MuseumObject } from "@/types";
import ObjectView from "./ObjectView";

function rowToObject(row: Record<string, unknown>): MuseumObject {
  return {
    id: row.id as string,
    institution: row.institution as "met" | "aic" | "rijks",
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

async function fetchObject(id: string): Promise<MuseumObject | null> {
  // 1. Try Supabase cache first — already have it if the user browsed to it
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("objects_cache")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) return rowToObject(data);
  } catch { /* fall through */ }

  // 2. Live fetch by institution
  if (id.startsWith("met-")) {
    const n = parseInt(id.slice(4), 10);
    if (!isNaN(n)) return fetchMetObject(n);
  }
  if (id.startsWith("aic-")) {
    const n = parseInt(id.slice(4), 10);
    if (!isNaN(n)) return fetchAicObject(n);
  }
  if (id.startsWith("rijks-")) {
    return fetchRijksObject(id.slice(6));
  }

  return null;
}

export default async function ObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const object = await fetchObject(id);
  if (!object) notFound();

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return <ObjectView object={object} currentUserId={user?.id ?? null} />;
}
