import { useState, useEffect, useCallback } from "react";

export interface RtmpClient {
  id: string;
  address: string;
  flashver: string;
  publishing: boolean;
}

export interface RtmpStream {
  name: string;
  bwIn: number;   // bytes/sec from source
  bwOut: number;  // bytes/sec to all clients
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string;
  clients: RtmpClient[];
}

export interface RtmpStats {
  live: boolean;
  stream: RtmpStream | null;
  /** Mevo (or any RTMP publisher) */
  source: RtmpClient | null;
  /** Each push relay connection */
  pushClients: RtmpClient[];
  fetchedAt: Date;
}

function getText(el: Element | null, tag: string): string {
  return el?.querySelector(tag)?.textContent?.trim() ?? "";
}

function parseStats(xml: string): RtmpStats {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");

  const streamEl = doc.querySelector("application[name='live'] stream, application > live > stream");
  // fallback: any stream element
  const streamNode = streamEl ?? doc.querySelector("stream");

  if (!streamNode) {
    return { live: false, stream: null, source: null, pushClients: [], fetchedAt: new Date() };
  }

  const bwIn  = parseInt(getText(streamNode, "bw_in"),  10) || 0;
  const bwOut = parseInt(getText(streamNode, "bw_out"), 10) || 0;
  const width  = parseInt(getText(streamNode, "width"),  10) || 0;
  const height = parseInt(getText(streamNode, "height"), 10) || 0;

  const clients: RtmpClient[] = [];
  streamNode.querySelectorAll("client").forEach((c) => {
    clients.push({
      id:         getText(c, "id"),
      address:    getText(c, "address"),
      flashver:   getText(c, "flashver"),
      publishing: c.querySelector("publishing") !== null,
    });
  });

  // The source publisher is the one with <publishing/> and a real flashver (FMLE, etc.)
  const source = clients.find((c) => c.publishing && !c.flashver.startsWith("ngx")) ?? null;
  // Push relays use the internal ngx flashver
  const pushClients = clients.filter((c) => c.flashver.startsWith("ngx"));

  const stream: RtmpStream = {
    name:       getText(streamNode, "name"),
    bwIn,
    bwOut,
    width,
    height,
    videoCodec: getText(streamNode, "codec") || getText(streamNode, "video > codec"),
    audioCodec: getText(streamNode, "acodec") || getText(streamNode, "audio > codec"),
    clients,
  };

  return { live: true, stream, source, pushClients, fetchedAt: new Date() };
}

const STATS_URL_KEY = "rtmp_stats_url";
const POLL_INTERVAL = 5000;

// Route through a Supabase Edge Function so the browser never makes a plain
// HTTP request (which would be blocked as mixed content from an HTTPS page).
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? "";

function proxyUrl(statsUrl: string): string {
  return `${SUPABASE_URL}/functions/v1/rtmp-stats?url=${encodeURIComponent(statsUrl)}`;
}

export function useRtmpStats() {
  const [statsUrl, setStatsUrlState] = useState<string>(
    () => localStorage.getItem(STATS_URL_KEY) ?? ""
  );
  const [stats, setStats]   = useState<RtmpStats | null>(null);
  const [error, setError]   = useState<string | null>(null);
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
          "apikey": SUPABASE_ANON_KEY,
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
