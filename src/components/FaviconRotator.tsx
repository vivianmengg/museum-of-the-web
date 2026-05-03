"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function FaviconRotator() {
  useEffect(() => {
    let urls: string[] = [];
    let idx = 0;
    let timer: ReturnType<typeof setInterval>;

    function setFavicon(url: string) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        document.head.appendChild(link);
      }
      link.rel = "icon";
      link.href = url;
    }

    function shuffle<T>(arr: T[]): T[] {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    async function init() {
      const supabase = createClient();
      const offset = Math.floor(Math.random() * 8000);
      const { data } = await supabase
        .from("objects_cache")
        .select("thumbnail_url")
        .not("thumbnail_url", "is", null)
        .not("year_begin", "is", null)
        .gte("year_begin", -7000)
        .range(offset, offset + 39);

      if (!data?.length) return;
      urls = shuffle(data.map(r => r.thumbnail_url as string));

      setFavicon(urls[0]);
      idx = 1;
      timer = setInterval(() => {
        setFavicon(urls[idx % urls.length]);
        idx++;
      }, 3000);
    }

    init();
    return () => clearInterval(timer);
  }, []);

  return null;
}
