"use client";

import { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import Link from "next/link";

type ToastData = { message: string; href: string; linkLabel: string };
type ToastCtx = { show: (t: ToastData) => void };

const Ctx = createContext<ToastCtx>({ show: () => {} });

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((t: ToastData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(t);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <div
          className={`fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100]
            bg-[var(--foreground)] text-[var(--background)] text-sm px-4 py-2.5 rounded-full
            shadow-lg flex items-center gap-2 whitespace-nowrap
            transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
        >
          <span>{toast.message}</span>
          <Link
            href={toast.href}
            className="underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
          >
            {toast.linkLabel}
          </Link>
        </div>
      )}
    </Ctx.Provider>
  );
}
