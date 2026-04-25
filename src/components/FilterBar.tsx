"use client";

import { useState } from "react";
import type { BrowseFilters } from "@/lib/constants";
import { MEDIUMS } from "@/lib/mediums";

type Props = {
  onFilter: (filters: BrowseFilters) => void;
};

type RegionPill = {
  label: string;
  countryFilter?: string;
  continentFilter?: string;
};

const REGIONS: RegionPill[] = [
  { label: "Japan",       countryFilter: "Japan" },
  { label: "China",       countryFilter: "China" },
  { label: "Korea",       countryFilter: "Korea" },
  { label: "India",       countryFilter: "India" },
  { label: "Egypt",       countryFilter: "Egypt" },
  { label: "Greece",      countryFilter: "Greece" },
  { label: "Italy",       countryFilter: "Italy" },
  { label: "France",      countryFilter: "France" },
  { label: "Netherlands", countryFilter: "Netherlands" },
  { label: "Britain",     countryFilter: "United Kingdom" },
  { label: "Islamic",     continentFilter: "islamic" },
  { label: "Africa",      continentFilter: "africa" },
];

export default function FilterBar({ onFilter }: Props) {
  const [activeRegion, setActiveRegion] = useState<RegionPill | null>(null);
  const [medium, setMedium]             = useState<string | null>(null);
  const [dateBegin, setDateBegin]       = useState("");
  const [dateEnd, setDateEnd]           = useState("");
  const [publicDomain, setPublicDomain] = useState(false);

  function apply(overrides: Partial<{
    region: RegionPill | null;
    medium: string | null;
    dateBegin: string;
    dateEnd: string;
  }>) {
    const r  = overrides.region    !== undefined ? overrides.region    : activeRegion;
    const m  = overrides.medium    !== undefined ? overrides.medium    : medium;
    const db = overrides.dateBegin !== undefined ? overrides.dateBegin : dateBegin;
    const de = overrides.dateEnd   !== undefined ? overrides.dateEnd   : dateEnd;
    onFilter({
      countryFilter:   r?.countryFilter   ?? undefined,
      continentFilter: r?.continentFilter ?? undefined,
      materialId:      m                  ?? undefined,
      dateBegin:       db || undefined,
      dateEnd:         de || undefined,
      publicDomain:    publicDomain || undefined,
    });
  }

  function toggleRegion(r: RegionPill) {
    const next = activeRegion?.label === r.label ? null : r;
    setActiveRegion(next);
    apply({ region: next });
  }

  function toggleMedium(value: string) {
    const next = medium === value ? null : value;
    setMedium(next);
    apply({ medium: next });
  }

  function togglePublicDomain() {
    const next = !publicDomain;
    setPublicDomain(next);
    onFilter({
      countryFilter:   activeRegion?.countryFilter   ?? undefined,
      continentFilter: activeRegion?.continentFilter ?? undefined,
      materialId:      medium                        ?? undefined,
      dateBegin:       dateBegin || undefined,
      dateEnd:         dateEnd   || undefined,
      publicDomain:    next || undefined,
    });
  }

  function reset() {
    setActiveRegion(null);
    setMedium(null);
    setDateBegin("");
    setDateEnd("");
    setPublicDomain(false);
    onFilter({});
  }

  const hasFilters = activeRegion || medium || dateBegin || dateEnd || publicDomain;

  const pillBase = "px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer";
  const pillOff  = `${pillBase} border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]`;
  const pillOn   = `${pillBase} bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]`;

  return (
    <div className="space-y-3 mb-8">
      {/* Region */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">Region</p>
        <div className="flex flex-wrap gap-1.5">
          {REGIONS.map((r) => (
            <button
              key={r.label}
              onClick={() => toggleRegion(r)}
              className={activeRegion?.label === r.label ? pillOn : pillOff}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Material */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">Material</p>
        <div className="flex flex-wrap gap-1.5">
          {MEDIUMS.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleMedium(m.id)}
              className={medium === m.id ? pillOn : pillOff}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Public domain toggle */}
      <div>
        <button
          onClick={togglePublicDomain}
          className={`flex items-center gap-2 px-3 py-1 text-xs rounded-full border transition-colors ${
            publicDomain ? pillOn : pillOff
          }`}
        >
          <span>{publicDomain ? "✓" : ""} Public domain only</span>
        </button>
      </div>

      {/* Date range */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] mb-2">Date</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="From year"
            value={dateBegin}
            onChange={(e) => { setDateBegin(e.target.value); apply({ dateBegin: e.target.value }); }}
            className="border border-[var(--border)] bg-white px-3 py-1.5 text-xs placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] w-24 rounded-full"
          />
          <span className="text-[var(--muted)] text-xs">–</span>
          <input
            type="number"
            placeholder="To year"
            value={dateEnd}
            onChange={(e) => { setDateEnd(e.target.value); apply({ dateEnd: e.target.value }); }}
            className="border border-[var(--border)] bg-white px-3 py-1.5 text-xs placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] w-24 rounded-full"
          />
          {hasFilters && (
            <button
              onClick={reset}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors ml-2"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
