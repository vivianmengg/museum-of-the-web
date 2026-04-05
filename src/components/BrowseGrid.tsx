"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Masonry from "react-masonry-css";
import ObjectCard from "./ObjectCard";
import FilterBar from "./FilterBar";
import type { MuseumObject } from "@/types";
import type { BrowseFilters } from "@/lib/constants";
import { usePinchZoom, zoomToBreakpoints } from "@/lib/usePinchZoom";

function dedupeKey(title: string, artist: string) {
  const t = title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24);
  const a = artist.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  return `${t}|${a}`;
}

type Props = {
  initialObjects: MuseumObject[];
  initialTotal: number;
  initialFilters?: BrowseFilters;
};

const SESSION_KEY = "browse-state";

export default function BrowseGrid({ initialObjects, initialTotal, initialFilters = {} }: Props) {
  const [objects, setObjects] = useState<MuseumObject[]>(initialObjects);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [showFilters, setShowFilters] = useState(false);
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [mounted, setMounted] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const filtersRef = useRef<BrowseFilters>(initialFilters);
  const hasMoreRef = useRef(initialObjects.length < initialTotal);

  const zoom = usePinchZoom(gridRef);
  const breakpoints = zoomToBreakpoints(zoom);

  useEffect(() => { setMounted(true); }, []);

  // Restore scroll position + loaded objects from sessionStorage on back-navigation
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const { objs, pg, tot, scrollY } = JSON.parse(saved);
      if (Array.isArray(objs) && objs.length > initialObjects.length) {
        setObjects(objs);
        setTotal(tot);
        pageRef.current = pg;
        setPage(pg);
        hasMoreRef.current = objs.length < tot;
        // Restore scroll after layout settles
        requestAnimationFrame(() => requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: "instant" });
        }));
        return; // skip pre-warm — we already have the objects
      }
    } catch { /* ignore */ }
    // No saved state — pre-warm next page
    if (hasMoreRef.current) fetchPage(pageRef.current, filtersRef.current, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist scroll position continuously (debounced)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const existing = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...existing, scrollY: window.scrollY }));
        } catch { /* storage full */ }
      }, 150);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { clearTimeout(timer); window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    setShowZoomHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setShowZoomHint(false), 900);
  }, [zoom]);

  const fetchPage = useCallback(async (
    nextPage: number,
    nextFilters: BrowseFilters,
    replace: boolean
  ) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    const params = new URLSearchParams({ page: String(nextPage) });
    if (nextFilters.q) params.set("q", nextFilters.q);
    if (nextFilters.culture) params.set("culture", nextFilters.culture);
    if (nextFilters.medium) params.set("medium", nextFilters.medium);
    if (nextFilters.dateBegin) params.set("dateBegin", nextFilters.dateBegin);
    if (nextFilters.dateEnd) params.set("dateEnd", nextFilters.dateEnd);

    try {
      const res = await fetch(`/api/objects?${params}`);
      const data = await res.json();
      const incoming: MuseumObject[] = data.objects ?? [];
      const newTotal: number = data.total ?? 0;

      setObjects((prev) => {
        const seenIds = new Set(prev.map((o) => o.id));
        const seenKeys = new Set(prev.map((o) => dedupeKey(o.title, o.artistName)));
        const fresh = replace
          ? incoming
          : incoming.filter((o) => {
              if (seenIds.has(o.id)) return false;
              const k = dedupeKey(o.title, o.artistName);
              if (seenKeys.has(k)) return false;
              seenIds.add(o.id);
              seenKeys.add(k);
              return true;
            });
        hasMoreRef.current = (replace ? fresh.length : prev.length + fresh.length) < newTotal;
        return replace ? fresh : [...prev, ...fresh];
      });
      setTotal(newTotal);
      pageRef.current = nextPage + 1;
      setPage(nextPage + 1);
      // Persist for back-navigation restore
      setObjects((prev) => {
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            objs: prev, pg: nextPage + 1, tot: newTotal, scrollY: window.scrollY,
          }));
        } catch { /* storage full */ }
        return prev;
      });
    } finally {
      loadingRef.current = false;
      if (observerRef.current && sentinelRef.current) {
        observerRef.current.unobserve(sentinelRef.current);
        observerRef.current.observe(sentinelRef.current);
      }
    }
  }, []);

  function handleFilter(newFilters: BrowseFilters) {
    filtersRef.current = newFilters;
    hasMoreRef.current = true;
    pageRef.current = 0;
    setObjects([]);
    sessionStorage.removeItem(SESSION_KEY);
    fetchPage(0, newFilters, true);
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
          fetchPage(pageRef.current, filtersRef.current, false);
        }
      },
      { rootMargin: "1000px" }
    );

    observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [fetchPage]);

  return (
    <div ref={gridRef}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[var(--muted)]">
          {total > 0 ? `${total.toLocaleString()} objects` : ""}
        </p>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-3 py-1 border border-[var(--border)] rounded-full"
        >
          {showFilters ? "Hide filters" : "Filter"}
        </button>
      </div>

      {showFilters && (
        <div className="mb-6">
          <FilterBar onFilter={handleFilter} />
        </div>
      )}

      <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-300 ${showZoomHint ? "opacity-100" : "opacity-0"}`}>
        <div className="bg-[var(--foreground)]/80 text-[var(--background)] text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`w-1 h-1 rounded-full ${i === zoom ? "bg-current scale-125" : "bg-current opacity-30"}`} />
          ))}
        </div>
      </div>

      <Masonry
        breakpointCols={mounted ? breakpoints : breakpoints.default}
        className="flex gap-1"
        columnClassName="flex flex-col gap-1 transition-[width] duration-200 ease-out"
      >
        {objects.map((obj) => (
          <ObjectCard key={obj.id} object={obj} />
        ))}
      </Masonry>

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}
