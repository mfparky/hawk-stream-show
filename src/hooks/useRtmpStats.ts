import { useState, useEffect, useCallback } from "react";

export interface RtmpStats {
  live:         boolean;
  bwIn:         number;   // bytes/sec from Mevo
  width:        number;
  height:       number;
  pushCount:    number;   // number of active push destinations
  srcConnected: boolean;
  fetchedAt:    Date;
}

function getText(el: Element | null, tag: string): string {
  return el?.querySelector(tag)?.textContent?.trim() ?? "";
}

function parseStats(xml: string): RtmpStats {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xml, "text/xml");

  const streamNode = doc.querySelector("stream");
  if (!streamNode) {
    return { live: false, bwIn: 0, width: 0, height: 0, pushCount: 0, srcConnected: false, fetchedAt: new Date() };
  }

  const bwIn   = parseInt(getText(streamNode, "bw_in"),  10) || 0;
  const width  = parseInt(getText(streamNode, "width"),  10) || 0;
  const height = parseInt(getText(streamNode, "height"), 10) || 0;

  let pushCount    = 0;
  let srcConnected = false;

  streamNode.querySelectorAll("client").forEach((c) => {
    const fv = getText(c, "flashver");
    // nginx push clients show up as "FMLE/3.0 (compatible; ngx-rtmp)" — they
    // contain "ngx-rtmp" but may not start with "ngx".
    if (fv.includes("ngx-rtmp") || fv.startsWith("ngx")) {
      pushCount++;
    } else if (c.querySelector("publishing")) {
      srcConnected = true;
    }
  });

  return { live: true, bwIn, width, height, pushCount, srcConnected, fetchedAt: new Date() };
}

const STATS_URL_KEY  = "rtmp_stats_url";
const POLL_INTERVAL  = 5000;

// Route through the Supabase Edge Function so the browser never makes a plain
// HTTP request (which would be blocked as mixed content from an HTTPS page).
const SUPABASE_URL      = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? "";

function proxyUrl(statsUrl: string): string {
  return `${SUPABASE_URL}/functions/v1/rtmp-stats?url=${encodeURIComponent(statsUrl)}`;
}

export function useRtmpStats() {
  const [statsUrl, setStatsUrlState] = useState<string>(
    () => localStorage.getItem(STATS_URL_KEY) ?? ""
  );
  const [stats, setStats]     = useState<RtmpStats | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const saveUrl = useCallback((url: string) => {
    localStorage.setItem(STATS_URL_KEY, url);
    setStatsUrlState(url);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!statsUrl) return;
    setLoading(true);
    try {
      const res = await fetch(proxyUrl(statsUrl), {
        cache: "no-store",
        headers: {
          "apikey":        SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setStats(parseStats(text));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setLoading(false);
    }
  }, [statsUrl]);

  useEffect(() => {
    fetchStats();
    if (!statsUrl) return;
    const id = setInterval(fetchStats, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchStats, statsUrl]);

  return { stats, error, loading, statsUrl, saveUrl, refetch: fetchStats };
}
