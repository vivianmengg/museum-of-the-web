import { CIVILIZATIONS } from "@/app/timeline/page";
import GlobeView from "./GlobeView";

export const revalidate = 3600;

export default function RegionPage() {
  return (
    <main className="pt-14">
      <GlobeView civilizations={CIVILIZATIONS} />
    </main>
  );
}
