import { Suspense } from "react";
import BrowseGrid from "@/components/BrowseGrid";
import SitePresence from "@/components/SitePresence";

export default function Home() {
  return (
    <div className="px-2 py-2">
      <SitePresence />
      <Suspense>
        <BrowseGrid />
      </Suspense>
    </div>
  );
}
