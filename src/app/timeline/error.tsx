"use client";

export default function TimelineError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-3.5rem)] gap-4">
      <p className="text-[var(--muted)] text-sm">The timeline couldn&apos;t load.</p>
      <button
        onClick={reset}
        className="text-xs px-4 py-1.5 border border-[var(--border)] rounded-full text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
