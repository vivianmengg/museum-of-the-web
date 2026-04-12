import { NextRequest, NextResponse } from "next/server";
import { fetchMetPage } from "@/lib/met";
import { fetchAicPage } from "@/lib/aic";
import { fetchRijksPage } from "@/lib/rijks";
import { fetchMomaPage } from "@/lib/moma";
import { fetchSeededPage } from "@/lib/seeded";
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
      // Deduplicate by title+artist — same work in multiple collections looks like a repeat
      const key = `${normalize(obj.title)}|${normalize(obj.artistName)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(obj);
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const filters: BrowseFilters = {
    q: searchParams.get("q") ?? undefined,
    culture: searchParams.get("culture") ?? undefined,
    medium: searchParams.get("medium") ?? undefined,
    dateBegin: searchParams.get("dateBegin") ?? undefined,
    dateEnd: searchParams.get("dateEnd") ?? undefined,
    publicDomain: searchParams.get("publicDomain") === "true" ? true : undefined,
  };

  try {
    const [met, aic, rijks, moma, seeded] = await Promise.all([
      fetchMetPage(filters, page),
      fetchAicPage(filters, page),
      fetchRijksPage(filters, page),
      fetchMomaPage(filters, page),
      fetchSeededPage(filters, page),
    ]);

    // Equal quota per source — each contributes at most 5 objects per page
    const Q = 5;
    const objects = interleaveDeduped(
      met.objects.slice(0, Q),
      aic.objects.slice(0, Q),
      rijks.objects.slice(0, Q),
      moma.objects.slice(0, Q),
      seeded.objects.slice(0, Q),
    );
    const total = met.total + aic.total + rijks.total + moma.total + seeded.total;

    return NextResponse.json({ objects, total });
  } catch {
    return NextResponse.json({ error: "Failed to fetch objects" }, { status: 500 });
  }
}
