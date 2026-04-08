import { Suspense } from "react";
import BrowseGrid from "@/components/BrowseGrid";
import SitePresence from "@/components/SitePresence";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const paramsKey = new URLSearchParams(sp).toString();

  return (
    <div className="px-2 py-2">
      <SitePresence />
      <Suspense key={paramsKey}>
        <BrowseGrid />
      </Suspense>
    </div>
  );
}
