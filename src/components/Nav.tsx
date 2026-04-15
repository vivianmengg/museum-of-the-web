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

  const browseActive = pathname === "/" || pathname.startsWith("/timeline") || pathname.startsWith("/artists") || pathname.startsWith("/artist") || pathname.startsWith("/region") || pathname.startsWith("/medium");

  const baseClass = `text-sm px-3 py-0.5 rounded-full transition-colors ${
    browseActive
      ? "bg-[var(--foreground)] text-[var(--background)]"
      : "hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
  }`;

  const itemClass = "flex items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--border)] transition-colors rounded-md";

  return (
    <div
      className="relative"
      ref={(el) => { ref.current = el; }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className={baseClass}>
        Browse
        <svg className="inline ml-1 mb-px" width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 3l2.5 2.5L6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-44 bg-white border border-[var(--border)] rounded-xl shadow-md overflow-hidden p-1 z-50">
          <Link href="/"         className={itemClass}>All objects</Link>
          <Link href="/region"   className={itemClass}>By region</Link>
          <Link href="/medium"   className={itemClass}>By material</Link>
          <Link href="/timeline" className={itemClass}>Timeline</Link>
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

  function mobileTabClass(href: string, exact = false) {
    const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href));
    return `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
      active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
    }`;
  }

  const browseActive = pathname === "/" || pathname.startsWith("/timeline") || pathname.startsWith("/artists") || pathname.startsWith("/artist") || pathname.startsWith("/region") || pathname.startsWith("/medium");

  return (
    <>
      {/* ── Desktop nav (hidden on mobile) ───────────────────────────────── */}
      <nav className="hidden sm:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-4 py-2.5 bg-white/90 backdrop-blur-sm border-b border-[var(--border)]">
        {/* Left */}
        <div className="flex items-center gap-1">
          <BrowseDropdown pathname={pathname} />
          <Link href="/explore" className={navClass("/explore")}>Explore</Link>
          <Link href="/exhibits" className={navClass("/exhibits")}>My collection</Link>
        </div>

        {/* Center: search */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Suspense><SearchBar /></Suspense>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link href={`/profile/${user.id}`} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors max-w-[100px] truncate">
                {user.email?.split("@")[0]}
              </Link>
              <span className="text-[var(--border)]">·</span>
              <button onClick={handleSignOut} className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/auth" className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* ── Mobile top bar (search + auth) ───────────────────────────────── */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="flex-1">
          <Suspense><SearchBar /></Suspense>
        </div>
        {user ? (
          <Link href={`/profile/${user.id}`} className="shrink-0 w-7 h-7 rounded-full bg-[var(--border)] flex items-center justify-center text-xs font-medium text-[var(--foreground)]">
            {(user.email?.split("@")[0] ?? "?")[0].toUpperCase()}
          </Link>
        ) : (
          <Link href="/auth" className="shrink-0 text-xs px-3 py-1.5 border border-[var(--border)] rounded-full text-[var(--muted)]">
            Sign in
          </Link>
        )}
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-[var(--border)] px-2 py-2 flex items-center justify-around">
        {/* Browse */}
        <Link href="/" className={`${mobileTabClass("/", true)} ${browseActive ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="text-[10px]">Browse</span>
        </Link>

        {/* Timeline */}
        <Link href="/timeline" className={mobileTabClass("/timeline")}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="6"  cy="10" r="2" fill="currentColor"/>
            <circle cx="10" cy="10" r="2" fill="currentColor"/>
            <circle cx="14" cy="10" r="2" fill="currentColor"/>
          </svg>
          <span className="text-[10px]">Timeline</span>
        </Link>

        {/* Explore */}
        <Link href="/explore" className={mobileTabClass("/explore")}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M13 7l-2.5 5.5L5 15l2-5.5L12.5 7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px]">Explore</span>
        </Link>

        {/* My collection */}
        <Link href="/exhibits" className={mobileTabClass("/exhibits")}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 3h10a1 1 0 011 1v13l-6-3-6 3V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <span className="text-[10px]">Collection</span>
        </Link>

        {/* New exhibit */}
        <Link href="/exhibit/new" className={mobileTabClass("/exhibit/new")}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="6.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="6.5" y1="10" x2="13.5" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-[10px]">New</span>
        </Link>
      </nav>
    </>
  );
}
