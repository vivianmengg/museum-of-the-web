"use client";

import { useState, useEffect, useCallback } from "react";
import type { MuseumObject } from "@/types";

const KEY = "motw_favorites";

function load(): MuseumObject[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<MuseumObject[]>([]);

  useEffect(() => { setFavorites(load()); }, []);

  const isFavorited = useCallback(
    (id: string) => favorites.some((o) => o.id === id),
    [favorites]
  );

  const toggle = useCallback((object: MuseumObject) => {
    setFavorites((prev) => {
      const next = prev.some((o) => o.id === object.id)
        ? prev.filter((o) => o.id !== object.id)
        : [object, ...prev];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { favorites, isFavorited, toggle };
}
