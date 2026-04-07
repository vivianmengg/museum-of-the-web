"use client";

import { useState, useEffect, useCallback } from "react";
import type { MuseumObject } from "@/types";

export type LocalExhibit = {
  id: string;
  title: string;
  statement: string;
  objects: Array<{ object: MuseumObject; note: string }>;
  savedAt: string;
};

const KEY = "motw_local_exhibits";

function load(): LocalExhibit[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); }
  catch { return []; }
}

function persist(exhibits: LocalExhibit[]) {
  localStorage.setItem(KEY, JSON.stringify(exhibits));
}

export function useLocalExhibits() {
  const [exhibits, setExhibits] = useState<LocalExhibit[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setExhibits(load()); setReady(true); }, []);

  const save = useCallback((draft: Omit<LocalExhibit, "id" | "savedAt">) => {
    const entry: LocalExhibit = { ...draft, id: crypto.randomUUID(), savedAt: new Date().toISOString() };
    setExhibits((prev) => { const next = [entry, ...prev]; persist(next); return next; });
    return entry.id;
  }, []);

  const update = useCallback((id: string, draft: Omit<LocalExhibit, "id" | "savedAt">) => {
    setExhibits((prev) => {
      const next = prev.map((e) => e.id === id ? { ...e, ...draft, savedAt: new Date().toISOString() } : e);
      persist(next); return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setExhibits((prev) => { const next = prev.filter((e) => e.id !== id); persist(next); return next; });
  }, []);

  // Add a single object to an existing exhibit
  const addObject = useCallback((exhibitId: string, object: MuseumObject) => {
    setExhibits((prev) => {
      const next = prev.map((e) => {
        if (e.id !== exhibitId) return e;
        if (e.objects.some((o) => o.object.id === object.id)) return e; // already in
        return { ...e, objects: [...e.objects, { object, note: "" }], savedAt: new Date().toISOString() };
      });
      persist(next); return next;
    });
  }, []);

  // Remove a single object from an existing exhibit
  const removeObject = useCallback((exhibitId: string, objectId: string) => {
    setExhibits((prev) => {
      const next = prev.map((e) => {
        if (e.id !== exhibitId) return e;
        return { ...e, objects: e.objects.filter((o) => o.object.id !== objectId), savedAt: new Date().toISOString() };
      });
      persist(next); return next;
    });
  }, []);

  // Create a new exhibit with one object already in it
  const createWithObject = useCallback((title: string, object: MuseumObject) => {
    const entry: LocalExhibit = {
      id: crypto.randomUUID(),
      title: title.trim() || "Untitled exhibit",
      statement: "",
      objects: [{ object, note: "" }],
      savedAt: new Date().toISOString(),
    };
    setExhibits((prev) => { const next = [entry, ...prev]; persist(next); return next; });
    return entry.id;
  }, []);

  const hasObject = useCallback((exhibitId: string, objectId: string) => {
    return exhibits.find((e) => e.id === exhibitId)?.objects.some((o) => o.object.id === objectId) ?? false;
  }, [exhibits]);

  const objectExhibits = useCallback((objectId: string) => {
    return exhibits.filter((e) => e.objects.some((o) => o.object.id === objectId));
  }, [exhibits]);

  return { exhibits, ready, save, update, remove, addObject, removeObject, createWithObject, hasObject, objectExhibits };
}
