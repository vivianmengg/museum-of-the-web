"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { MuseumObject } from "@/types";

type CurationContextType = {
  selected: MuseumObject[];
  isSelected: (id: string) => boolean;
  toggle: (object: MuseumObject) => void;
  clear: () => void;
};

const CurationContext = createContext<CurationContextType | null>(null);

export function CurationProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<MuseumObject[]>([]);

  const isSelected = useCallback(
    (id: string) => selected.some((o) => o.id === id),
    [selected]
  );

  const toggle = useCallback((object: MuseumObject) => {
    setSelected((prev) =>
      prev.some((o) => o.id === object.id)
        ? prev.filter((o) => o.id !== object.id)
        : prev.length < 20
        ? [...prev, object]
        : prev
    );
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  return (
    <CurationContext.Provider value={{ selected, isSelected, toggle, clear }}>
      {children}
    </CurationContext.Provider>
  );
}

export function useCuration() {
  const ctx = useContext(CurationContext);
  if (!ctx) throw new Error("useCuration must be used inside CurationProvider");
  return ctx;
}
