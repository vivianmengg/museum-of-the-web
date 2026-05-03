import TimelineView from "./TimelineView";
import { CIVILIZATIONS } from "@/lib/timeline";

export default function TimelinePage() {
  return <TimelineView civilizations={CIVILIZATIONS} />;
}
