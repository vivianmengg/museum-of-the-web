"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

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
        <Link href="/" className={navClass("/")}>Browse</Link>
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
