"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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

const SESSION_KEY = "browse-state";

export default function BrowseGrid() {
  const searchParams = useSearchParams();
  const initialFilters: BrowseFilters = {
    q:           searchParams.get("q")           ?? undefined,
    culture:     searchParams.get("culture")     ?? undefined,
    medium:      searchParams.get("medium")      ?? undefined,
    dateBegin:   searchParams.get("dateBegin")   ?? undefined,
    dateEnd:     searchParams.get("dateEnd")     ?? undefined,
    publicDomain: searchParams.get("publicDomain") === "true" ? true : undefined,
  };

  const [objects, setObjects] = useState<MuseumObject[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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
  const hasMoreRef = useRef(true);
  const [hasMore, setHasMore] = useState(true);

  const zoom = usePinchZoom(gridRef);
  const breakpoints = zoomToBreakpoints(zoom);

  useEffect(() => { setMounted(true); }, []);

  // Restore scroll position + loaded objects from sessionStorage on back-navigation
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const { objs, pg, tot, scrollY, filters: savedFilters } = JSON.parse(saved);
      const filtersMatch = JSON.stringify(savedFilters ?? {}) === JSON.stringify(initialFilters);
      if (filtersMatch && Array.isArray(objs) && objs.length > 0) {
        setObjects(objs);
        setTotal(tot);
        pageRef.current = pg;
        setPage(pg);
        hasMoreRef.current = objs.length < tot;
        setHasMore(objs.length < tot);
        setLoading(false);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: "instant" });
        }));
        return;
      }
    } catch { /* ignore */ }
    // No saved state — fetch page 0
    fetchPage(0, filtersRef.current, true);
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

      setLoading(false);

      if (!replace && incoming.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
        return;
      }

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
        const more = fresh.length > 0 && (replace ? fresh.length : prev.length + fresh.length) < newTotal;
        hasMoreRef.current = more;
        setHasMore(more);
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
            filters: filtersRef.current,
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
    setHasMore(true);
    pageRef.current = 0;
    setObjects([]);
    setLoading(true);
    sessionStorage.removeItem(SESSION_KEY);
    fetchPage(0, newFilters, true);
  }

  function handleRefresh() {
    hasMoreRef.current = true;
    setHasMore(true);
    pageRef.current = 0;
    setObjects([]);
    setLoading(true);
    sessionStorage.removeItem(SESSION_KEY);
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchPage(0, filtersRef.current, true);
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-3 py-1 border border-[var(--border)] rounded-full"
            aria-label="Refresh"
          >
            ↺
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-3 py-1 border border-[var(--border)] rounded-full"
          >
            {showFilters ? "Hide filters" : "Filter"}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6">
          <FilterBar onFilter={handleFilter} />
        </div>
      )}


      {loading ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="mb-1 break-inside-avoid rounded-md bg-[var(--border)]/40 animate-pulse"
              style={{ height: `${120 + (i % 5) * 40}px` }}
            />
          ))}
        </div>
      ) : (
        <Masonry
          breakpointCols={mounted ? breakpoints : breakpoints.default}
          className="flex gap-1"
          columnClassName="flex flex-col gap-1 transition-[width] duration-200 ease-out"
        >
          {objects.map((obj, i) => (
            <ObjectCard key={obj.id} object={obj} priority={i < 12} />
          ))}
        </Masonry>
      )}

      <div ref={sentinelRef} className="h-4" />
      {!hasMore && objects.length > 0 && (
        <p className="text-center text-xs text-[var(--muted)] py-8">You've seen everything for today. Come back tomorrow for a new selection.</p>
      )}
    </div>
  );
}
