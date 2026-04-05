import { fetchMetPage } from "@/lib/met";
import { fetchAicPage } from "@/lib/aic";
import { fetchRijksPage } from "@/lib/rijks";
import { fetchMomaPage } from "@/lib/moma";
import BrowseGrid from "@/components/BrowseGrid";
import type { BrowseFilters } from "@/lib/constants";
import type { MuseumObject } from "@/types";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
}

function interleaveDeduped(...arrays: MuseumObject[][]): MuseumObject[] {
  const out: MuseumObject[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(...arrays.map((a) => a.length));
  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i >= arr.length) continue;
      const obj = arr[i];
      const key = `${normalize(obj.title)}|${normalize(obj.artistName)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(obj);
    }
  }
  return out;
}

type Props = {
  searchParams: Promise<{ q?: string; culture?: string; medium?: string; dateBegin?: string; dateEnd?: string; publicDomain?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const filters: BrowseFilters = {
    q: params.q,
    culture: params.culture,
    medium: params.medium,
    dateBegin: params.dateBegin,
    dateEnd: params.dateEnd,
    publicDomain: params.publicDomain === "true" ? true : undefined,
  };

  const [met, aic, rijks, moma] = await Promise.all([
    fetchMetPage(filters, 0),
    fetchAicPage(filters, 0),
    fetchRijksPage(filters, 0),
    fetchMomaPage(filters, 0),
  ]);
  const Q = 5;
  const objects = interleaveDeduped(
    met.objects.slice(0, Q),
    aic.objects.slice(0, Q),
    rijks.objects.slice(0, Q),
    moma.objects.slice(0, Q),
  );
  const total = met.total + aic.total + rijks.total + moma.total;

  return (
    <div className="px-2 py-2">
      {params.q && (
        <p className="text-xs text-[var(--muted)] px-1 mb-3">
          <span className="text-[var(--foreground)]">"{params.q}"</span>
          {[params.culture, params.medium, params.dateBegin && params.dateEnd
            ? `${params.dateBegin}–${params.dateEnd}`
            : params.dateBegin ?? params.dateEnd]
            .filter(Boolean)
            .map((tag) => (
              <span key={tag} className="ml-2 px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--muted)]">
                {tag}
              </span>
            ))}
          <span className="ml-2 opacity-50">· {total.toLocaleString()} objects</span>
        </p>
      )}
      <BrowseGrid
        key={JSON.stringify(filters)}
        initialObjects={objects}
        initialTotal={total}
        initialFilters={filters}
      />
    </div>
  );
}
