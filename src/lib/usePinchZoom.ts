"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// zoom: 0 = most columns (zoomed out), MAX_ZOOM = fewest columns (zoomed in)
const MAX_ZOOM = 4;
const WHEEL_SENSITIVITY = 80;   // deltaY units needed to step one level
const PINCH_STEP_RATIO = 0.15;  // touch distance change needed to step one level

export function usePinchZoom(ref: React.RefObject<HTMLElement | null>) {
  const [zoom, setZoom] = useState(2); // default: middle of range
  const wheelAccum = useRef(0);
  const touchDist = useRef<number | null>(null);

  const step = useCallback((delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(0, z + delta)));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ── Trackpad pinch (ctrl + wheel) ──────────────────────────
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();

      wheelAccum.current += e.deltaY;
      if (wheelAccum.current > WHEEL_SENSITIVITY) {
        step(-1);        // pinch in → fewer cols (zoom in)
        wheelAccum.current = 0;
      } else if (wheelAccum.current < -WHEEL_SENSITIVITY) {
        step(1);         // pinch out → more cols (zoom out)
        wheelAccum.current = 0;
      }
    }

    // ── Touch pinch ────────────────────────────────────────────
    function dist(t: TouchList) {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) touchDist.current = dist(e.touches);
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || touchDist.current === null) return;
      e.preventDefault();
      const d = dist(e.touches);
      const ratio = d / touchDist.current;
      if (ratio > 1 + PINCH_STEP_RATIO) {
        step(-1);
        touchDist.current = d;
      } else if (ratio < 1 - PINCH_STEP_RATIO) {
        step(1);
        touchDist.current = d;
      }
    }

    function onTouchEnd() {
      touchDist.current = null;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, step]);

  return zoom;
}

// Map zoom level → column counts per breakpoint
export function zoomToBreakpoints(zoom: number) {
  // zoom 0 = most cols, zoom 4 = fewest cols
  const base = [6, 5, 4, 3, 2][zoom];
  return {
    default: base,
    1280:    Math.max(base - 1, 1),
    1024:    Math.max(base - 2, 1),
    640:     Math.max(Math.min(base - 2, 2), 1),
  };
}
