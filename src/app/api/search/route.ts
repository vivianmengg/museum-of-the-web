import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { BrowseFilters } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ q: "" });
  return NextResponse.json({ q } satisfies BrowseFilters);
}
