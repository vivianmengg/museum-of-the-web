"use client";

import { useState } from "react";
import type { BrowseFilters } from "@/lib/constants";

type Props = {
  onFilter: (filters: BrowseFilters) => void;
};

export default function FilterBar({ onFilter }: Props) {
  const [q, setQ] = useState("");
  const [culture, setCulture] = useState("");
  const [medium, setMedium] = useState("");
  const [dateBegin, setDateBegin] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onFilter({
      q: q || undefined,
      culture: culture || undefined,
      medium: medium || undefined,
      dateBegin: dateBegin || undefined,
      dateEnd: dateEnd || undefined,
    });
  }

  function reset() {
    setQ("");
    setCulture("");
    setMedium("");
    setDateBegin("");
    setDateEnd("");
    onFilter({});
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap gap-2 items-end mb-10"
    >
      <input
        type="text"
        placeholder="Search…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="border border-[var(--border)] bg-white px-3 py-1.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] w-40"
      />
      <input
        type="text"
        placeholder="Culture"
        value={culture}
        onChange={(e) => setCulture(e.target.value)}
        className="border border-[var(--border)] bg-white px-3 py-1.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] w-32"
      />
      <input
        type="text"
        placeholder="Medium"
        value={medium}
        onChange={(e) => setMedium(e.target.value)}
        className="border border-[var(--border)] bg-white px-3 py-1.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] w-32"
      />
      <div className="flex items-center gap-1">
        <input
          type="number"
          placeholder="From"
          value={dateBegin}
          onChange={(e) => setDateBegin(e.target.value)}
          className="border border-[var(--border)] bg-white px-3 py-1.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] w-20"
        />
        <span className="text-[var(--muted)] text-sm">–</span>
        <input
          type="number"
          placeholder="To"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          className="border border-[var(--border)] bg-white px-3 py-1.5 text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] w-20"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-1.5 text-sm bg-[var(--foreground)] text-[var(--background)] hover:opacity-80 transition-opacity"
      >
        Filter
      </button>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-1.5 text-sm border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        Clear
      </button>
    </form>
  );
}
