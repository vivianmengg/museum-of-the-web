"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function BrowseDropdown({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useState(() => ({ current: null as HTMLDivElement | null }))[0];

  const browseActive = pathname === "/" || pathname.startsWith("/timeline") || pathname.startsWith("/region");

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref]);

  const baseClass = `text-sm px-3 py-0.5 rounded-full transition-colors ${
    browseActive
      ? "bg-[var(--foreground)] text-[var(--background)]"
      : "hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
  }`;

  const itemClass = "flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--border)] transition-colors rounded-md";

  return (
    <div className="relative" ref={(el) => { ref.current = el; }}>
      <button onClick={() => setOpen((v) => !v)} className={baseClass}>
        Browse
        <svg className="inline ml-1 mb-px" width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 3l2.5 2.5L6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-[var(--border)] rounded-xl shadow-md overflow-hidden p-1 z-50">
          <Link href="/"        onClick={() => setOpen(false)} className={itemClass}>All objects</Link>
          <Link href="/timeline" onClick={() => setOpen(false)} className={itemClass}>Timeline</Link>
          <Link href="/region"   onClick={() => setOpen(false)} className={itemClass}>By region</Link>
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN") syncLocalExhibits();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function syncLocalExhibits() {
    // Grab and clear atomically so concurrent SIGNED_IN events don't double-sync
    const raw = localStorage.getItem("motw_local_exhibits");
    if (!raw) return;
    localStorage.removeItem("motw_local_exhibits");

    try {
      const local = JSON.parse(raw);
      if (!Array.isArray(local) || local.length === 0) return;

      await Promise.all(local.map((exhibit) =>
        fetch("/api/exhibits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: exhibit.title,
            statement: exhibit.statement ?? "",
            objects: exhibit.objects.map((o: { object: { id: string; institution: string }; note: string }, i: number) => ({
              object_id: o.object.id,
              institution: o.object.institution,
              curator_note: o.note ?? "",
              position: i,
            })),
          }),
        })
      ));
    } catch {
      // Restore if sync failed so nothing is lost
      localStorage.setItem("motw_local_exhibits", raw);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  function navClass(href: string) {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return `text-sm px-3 py-0.5 rounded-full transition-colors ${
      active
        ? "bg-[var(--foreground)] text-[var(--background)]"
        : "hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 pointer-events-none">
      {/* Left: nav links */}
      <div className="pointer-events-auto flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-[var(--border)] rounded-full px-2 py-1.5 shadow-sm">
        <BrowseDropdown pathname={pathname} />
        <Link href="/explore" className={navClass("/explore")}>Explore</Link>
        <Link href="/exhibits" className={navClass("/exhibits")}>My collection</Link>
      </div>

      {/* Center: search */}
      <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
        <Suspense>
          <SearchBar />
        </Suspense>
      </div>

      {/* Right */}
      <div className="pointer-events-auto flex items-center gap-2">
        <Link
          href="/exhibit/new"
          className="text-sm px-4 py-1.5 bg-white/90 backdrop-blur-sm border border-[var(--border)] rounded-full shadow-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          + Exhibit
        </Link>
        {user ? (
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-[var(--border)] rounded-full px-3 py-1.5 shadow-sm">
            <Link
              href={`/profile/${user.id}`}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors max-w-[100px] truncate"
            >
              {user.email?.split("@")[0]}
            </Link>
            <span className="text-[var(--border)]">·</span>
            <button
              onClick={handleSignOut}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="text-sm px-4 py-1.5 bg-white/90 backdrop-blur-sm border border-[var(--border)] rounded-full shadow-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
