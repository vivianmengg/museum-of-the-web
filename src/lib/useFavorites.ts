"use client";

import { useState, useEffect, useCallback } from "react";
import type { MuseumObject } from "@/types";
import { createClient } from "@/lib/supabase/client";

const LOCAL_KEY = "motw_favorites";

function loadLocal(): MuseumObject[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]"); }
  catch { return []; }
}

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

export function useFavorites() {
  const [favorites, setFavorites] = useState<MuseumObject[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setSignedIn(true);

        // Migrate any localStorage favorites into the cloud (one-time)
        const local = loadLocal();
        if (local.length > 0) {
          await supabase.from("favorites").upsert(
            local.map((o) => ({
              user_id: data.user!.id,
              object_id: o.id,
              institution: o.institution,
            })),
            { onConflict: "user_id,object_id", ignoreDuplicates: true }
          );
          localStorage.removeItem(LOCAL_KEY);
        }

        const { data: favRows } = await supabase
          .from("favorites")
          .select("object_id")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false });

        if (favRows && favRows.length > 0) {
          const ids = favRows.map((r) => r.object_id as string);
          const { data: objects } = await supabase
            .from("objects_cache")
            .select("*")
            .in("id", ids);
          const objMap = new Map((objects ?? []).map((o) => [o.id as string, o]));
          setFavorites(ids.map((id) => objMap.get(id)).filter(Boolean).map(rowToObject));
        }
      } else {
        setFavorites(loadLocal());
      }
      setReady(true);
    });
  }, []);

  const isFavorited = useCallback(
    (id: string) => favorites.some((o) => o.id === id),
    [favorites]
  );

  const toggle = useCallback(async (object: MuseumObject) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const alreadyFaved = favorites.some((o) => o.id === object.id);

    if (user) {
      if (alreadyFaved) {
        await supabase.from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("object_id", object.id);
      } else {
        await supabase.from("favorites").insert({
          user_id: user.id,
          object_id: object.id,
          institution: object.institution,
        });
      }
    } else {
      const next = alreadyFaved
        ? favorites.filter((o) => o.id !== object.id)
        : [object, ...favorites];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    }

    setFavorites((prev) =>
      alreadyFaved
        ? prev.filter((o) => o.id !== object.id)
        : [object, ...prev]
    );
  }, [favorites]);

  return { favorites, isFavorited, toggle, ready };
}
