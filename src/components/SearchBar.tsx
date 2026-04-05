"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BrowseFilters } from "@/lib/constants";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [parsing, setParsing] = useState(false);

  // Keep input in sync if URL changes (e.g. back button)
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) { router.push("/"); return; }

    setParsing(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const filters: BrowseFilters = res.ok ? await res.json() : { q };
      const params = new URLSearchParams();
      if (filters.q)         params.set("q",         filters.q);
      if (filters.culture)   params.set("culture",   filters.culture);
      if (filters.medium)    params.set("medium",     filters.medium);
      if (filters.dateBegin) params.set("dateBegin",  filters.dateBegin);
      if (filters.dateEnd)   params.set("dateEnd",    filters.dateEnd);
      router.push(`/?${params.toString()}`);
    } catch {
      router.push(`/?q=${encodeURIComponent(q)}`);
    } finally {
      setParsing(false);
    }
  }

  function handleClear() {
    setValue("");
    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      {/* Icon: spinner while parsing, magnifier otherwise */}
      <span className="absolute left-3 text-[var(--muted)] pointer-events-none">
        {parsing ? (
          <svg width="13" height="13" viewBox="0 0 13 13" className="animate-spin" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="20" strokeDashoffset="8" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        )}
      </span>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search the collection…"
        disabled={parsing}
        className="w-48 sm:w-64 bg-white/90 backdrop-blur-sm border border-[var(--border)] rounded-full pl-8 pr-8 py-1.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] transition-[width,border-color] duration-200 focus:w-72 sm:focus:w-80 shadow-sm disabled:opacity-60"
      />

      {value && !parsing && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Clear search"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </form>
  );
}
