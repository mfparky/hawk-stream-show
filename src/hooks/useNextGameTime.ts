import { useEffect, useState } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase";

const CACHE_KEY = "gcNextGame.v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CachedPayload {
  startsAt: string | null;
  fetchedAt: number;
}

export function useNextGameTime(): Date | null {
  const [next, setNext] = useState<Date | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { startsAt } = JSON.parse(raw) as CachedPayload;
      if (!startsAt) return null;
      const d = new Date(startsAt);
      return d.getTime() > Date.now() ? d : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Skip if cache is still fresh
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as CachedPayload;
          if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) return;
        }
      } catch { /* ignore */ }

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/gc-next-game`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (!res.ok) throw new Error(`gc-next-game ${res.status}`);
        const json = await res.json();
        const startsAt: string | null = json?.next?.startsAt ?? null;
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ startsAt, fetchedAt: Date.now() } satisfies CachedPayload),
        );
        if (cancelled) return;
        setNext(startsAt ? new Date(startsAt) : null);
      } catch (e) {
        console.warn("[useNextGameTime]", e);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return next;
}
