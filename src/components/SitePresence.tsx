"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type PresenceEntry = {
  status: "browsing" | "viewing";
  objectId?: string;
  objectTitle?: string;
};

type PresenceState = {
  [key: string]: PresenceEntry[];
};

export default function SitePresence() {
  const [browsing, setBrowsing] = useState(0);
  const [viewing, setViewing] = useState<{ objectId: string; objectTitle: string }[]>([]);
  const [expanded, setExpanded] = useState(false);
  const myIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    let anonId = sessionStorage.getItem("motw_anon_id");
    if (!anonId) {
      anonId = crypto.randomUUID();
      sessionStorage.setItem("motw_anon_id", anonId);
    }
    myIdRef.current = anonId;

    const channel = supabase.channel("motw:site");

    function sync() {
      const state = channel.presenceState() as PresenceState;
      let browsingCount = 0;
      const viewingList: { objectId: string; objectTitle: string }[] = [];
      const seen = new Set<string>();

      for (const entries of Object.values(state)) {
        const entry = entries[0] as PresenceEntry & { user_id?: string };
        if (entry.status === "browsing") {
          browsingCount++;
        } else if (entry.status === "viewing" && entry.objectId && entry.objectTitle) {
          if (!seen.has(entry.objectId)) {
            seen.add(entry.objectId);
            viewingList.push({ objectId: entry.objectId, objectTitle: entry.objectTitle });
          }
        }
      }

      setBrowsing(browsingCount);
      setViewing(viewingList);
    }

    channel
      .on("presence", { event: "sync" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: anonId, status: "browsing" });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, []);

  const total = browsing + viewing.length;
  if (total <= 1) return null; // only show when others are present

  const others = total - 1;

  return (
    <div className="mb-4 px-1">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors group"
      >
        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
        </span>
        <span>
          {others === 1 ? "1 other" : `${others} others`} in the museum right now
        </span>
        {viewing.length > 0 && (
          <span className="opacity-50">
            · {viewing.length} viewing
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 ml-3.5 pl-3 border-l border-[var(--border)] space-y-1">
          {browsing > 1 && (
            <p className="text-xs text-[var(--muted)]">
              {browsing - 1} browsing
            </p>
          )}
          {browsing === 1 && viewing.length > 0 && (
            <p className="text-xs text-[var(--muted)]">
              1 browsing
            </p>
          )}
          {viewing.map(({ objectId, objectTitle }) => (
            <p key={objectId} className="text-xs text-[var(--muted)]">
              looking at{" "}
              <a
                href={`/object/${objectId}`}
                className="text-[var(--foreground)] hover:opacity-70 transition-opacity"
              >
                {objectTitle}
              </a>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
