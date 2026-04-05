"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCuration } from "./CurationContext";

export default function CurationTray() {
  const { selected, clear } = useCuration();
  const router = useRouter();

  if (selected.length === 0) return null;

  function handleBuild() {
    // Encode selected IDs into query params for the exhibit builder (Step 7)
    const ids = selected.map((o) => o.id).join(",");
    router.push(`/exhibit/new?objects=${encodeURIComponent(ids)}`);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="mx-auto max-w-3xl mb-4 px-4">
        <div className="bg-[var(--foreground)] text-[var(--background)] rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4">

          {/* Thumbnail strip */}
          <div className="flex items-center gap-1 flex-1 overflow-hidden">
            {selected.map((obj) => (
              <div
                key={obj.id}
                className="relative w-10 h-10 flex-shrink-0 overflow-hidden rounded"
              >
                {obj.thumbnailUrl && (
                  <Image
                    src={obj.thumbnailUrl}
                    alt={obj.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </div>
            ))}
            <span className="text-sm ml-2 opacity-70 flex-shrink-0">
              {selected.length} {selected.length === 1 ? "object" : "objects"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={clear}
              className="text-xs opacity-50 hover:opacity-100 transition-opacity px-2 py-1"
            >
              Clear
            </button>
            <button
              onClick={handleBuild}
              className="text-sm bg-[var(--background)] text-[var(--foreground)] px-4 py-1.5 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Build exhibit →
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
