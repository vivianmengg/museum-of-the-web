"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Message = { id: string; text: string; mine: boolean };

export default function PresencePanel({
  objectId,
  currentUserId,
}: {
  objectId: string;
  currentUserId: string | null;
}) {
  const [count, setCount] = useState(1);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let anonId = sessionStorage.getItem("motw_anon_id");
    if (!anonId) {
      anonId = crypto.randomUUID();
      sessionStorage.setItem("motw_anon_id", anonId);
    }
    const userId = currentUserId ?? anonId;

    const channel = supabase.channel(`object-room:${objectId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        setCount(Object.keys(channel.presenceState()).length);
      })
      .on("broadcast", { event: "whisper" }, ({ payload }: { payload: { text: string; sender: string } }) => {
        const id = crypto.randomUUID();
        const mine = payload.sender === userId;
        setMessages((prev) => [...prev.slice(-49), { id, text: payload.text, mine }]);
        // Ephemeral — fade after 5 min
        setTimeout(() => removeMessage(id), 5 * 60 * 1000);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, joined_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [objectId, currentUserId, removeMessage]);

  // Scroll to bottom when new messages arrive (only if panel is open)
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !channelRef.current) return;

    let anonId = sessionStorage.getItem("motw_anon_id") ?? "";
    const sender = currentUserId ?? anonId;

    channelRef.current.send({
      type: "broadcast",
      event: "whisper",
      payload: { text, sender },
    });
    setInput("");
  }

  const others = count - 1;

  return (
    <div className="mb-8 border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f5f3ef] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Glowing dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ backgroundColor: others > 0 ? "#86efac" : "#d1d5db" }}
            />
            <span
              className="relative inline-flex rounded-full h-2.5 w-2.5"
              style={{ backgroundColor: others > 0 ? "#4ade80" : "#9ca3af" }}
            />
          </span>
          <span className="text-sm text-[var(--muted)]">
            {others === 0
              ? "You're the only one here"
              : others === 1
              ? "1 other viewing now"
              : `${others} others viewing now`}
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="border-t border-[var(--border)]">
          {/* Messages */}
          <div className="h-48 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {messages.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic m-auto text-center leading-relaxed">
                {others === 0
                  ? "No one else is here right now.\nSay something anyway."
                  : "Say something to the room."}
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
                >
                  <span
                    className={`max-w-[80%] text-xs px-3 py-1.5 rounded-2xl leading-relaxed ${
                      m.mine
                        ? "bg-[var(--foreground)] text-[var(--background)] rounded-br-sm"
                        : "bg-[var(--border)] text-[var(--foreground)] rounded-bl-sm"
                    }`}
                  >
                    {m.text}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={send}
            className="flex items-center gap-2 px-3 py-2 border-t border-[var(--border)]"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 200))}
              placeholder="Say something…"
              className="flex-1 bg-transparent text-xs placeholder:text-[var(--muted)] focus:outline-none py-1"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-30 flex-shrink-0"
              aria-label="Send"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12.5 7H2M7.5 2.5L12.5 7l-5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
