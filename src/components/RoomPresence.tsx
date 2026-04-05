"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Whisper = { id: string; text: string };

export default function RoomPresence({
  objectId,
  currentUserId,
}: {
  objectId: string;
  currentUserId: string | null;
}) {
  const [count, setCount] = useState(1);
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const [whispering, setWhispering] = useState(false);
  const [input, setInput] = useState("");
  const [justArrived, setJustArrived] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const removeWhisper = useCallback((id: string) => {
    setWhispers((prev) => prev.filter((w) => w.id !== id));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Stable anonymous ID for this browser session
    let anonId = sessionStorage.getItem("motw_anon_id");
    if (!anonId) {
      anonId = crypto.randomUUID();
      sessionStorage.setItem("motw_anon_id", anonId);
    }
    const userId = currentUserId ?? anonId;

    const channel = supabase.channel(`object-room:${objectId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const newCount = Object.keys(channel.presenceState()).length;
        setCount((prev) => {
          if (newCount > prev) setJustArrived(true);
          return newCount;
        });
      })
      .on(
        "broadcast",
        { event: "whisper" },
        ({ payload }: { payload: { text: string } }) => {
          const id = crypto.randomUUID();
          setWhispers((prev) => [...prev.slice(-4), { id, text: payload.text }]);
          setTimeout(() => removeWhisper(id), 60000);
        }
      )
      .subscribe(async (status) => {
        console.log("[RoomPresence] channel status:", status);
        if (status === "SUBSCRIBED") {
          const trackResult = await channel.track({
            user_id: userId,
            joined_at: new Date().toISOString(),
          });
          console.log("[RoomPresence] track result:", trackResult);
        }
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [objectId, currentUserId, removeWhisper]);

  // Clear pulse after animation
  useEffect(() => {
    if (!justArrived) return;
    const t = setTimeout(() => setJustArrived(false), 1200);
    return () => clearTimeout(t);
  }, [justArrived]);

  // Focus input when whisper mode opens
  useEffect(() => {
    if (whispering) inputRef.current?.focus();
  }, [whispering]);

  function sendWhisper(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !channelRef.current) return;

    // Broadcast to others
    channelRef.current.send({
      type: "broadcast",
      event: "whisper",
      payload: { text },
    });

    // Show locally too (sender sees their own whisper)
    const id = crypto.randomUUID();
    setWhispers((prev) => [...prev.slice(-4), { id, text }]);
    setTimeout(() => removeWhisper(id), 60000);

    setInput("");
    setWhispering(false);
  }

  const othersPresent = count > 1;

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2 pointer-events-none">
      {/* Whispers — float above the pill */}
      <div className="flex flex-col items-end gap-1.5">
        {whispers.map((w) => (
          <div
            key={w.id}
            className="pointer-events-none max-w-[220px] px-3 py-2 bg-white/95 backdrop-blur-sm border border-[var(--border)] rounded-2xl rounded-br-sm text-xs text-[var(--muted)] leading-relaxed shadow-sm"
            style={{ animation: "whisperFade 60s forwards" }}
          >
            {w.text}
          </div>
        ))}
      </div>

      {/* Whisper input */}
      {whispering && (
        <form
          onSubmit={sendWhisper}
          className="pointer-events-auto flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 140))}
            onKeyDown={(e) => e.key === "Escape" && setWhispering(false)}
            placeholder="say something into the room…"
            className="w-52 bg-white/95 backdrop-blur-sm border border-[var(--border)] rounded-full px-4 py-1.5 text-xs placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--muted)] shadow-sm transition-colors"
          />
        </form>
      )}

      {/* Presence pill */}
      <div
        className="pointer-events-auto flex items-center gap-2.5 bg-white/95 backdrop-blur-sm border border-[var(--border)] rounded-full px-3 py-1.5 shadow-sm transition-all duration-500"
      >
        {othersPresent && (
          <span
            className="flex items-center gap-1.5 text-xs text-[var(--muted)]"
            style={justArrived ? { animation: "presencePulse 0.6s ease-in-out 2" } : undefined}
          >
            <Silhouettes count={count} />
            {count - 1 === 1 ? "1 other here" : `${count - 1} others here`}
          </span>
        )}

        <button
          onClick={() => setWhispering((v) => !v)}
          className={`text-xs transition-colors ${
            whispering
              ? "text-[var(--foreground)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {whispering ? "cancel" : "whisper"}
        </button>
      </div>
    </div>
  );
}

// Abstract silhouettes — shows up to 3, each slightly offset
function Silhouettes({ count }: { count: number }) {
  const show = Math.min(count - 1, 3); // exclude self
  return (
    <span className="flex items-end">
      {Array.from({ length: show }).map((_, i) => (
        <svg
          key={i}
          width="7"
          height="9"
          viewBox="0 0 7 9"
          fill="currentColor"
          className={i > 0 ? "-ml-0.5 opacity-70" : ""}
          style={{ opacity: 1 - i * 0.2 }}
        >
          <circle cx="3.5" cy="2" r="1.8" />
          <path d="M0 8.5C0 6.3 1.57 4.5 3.5 4.5S7 6.3 7 8.5H0z" />
        </svg>
      ))}
    </span>
  );
}
