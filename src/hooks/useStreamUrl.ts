import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { STREAM_URL_KEY, STREAM_AUTO_URL_KEY, STREAM_AUTO_EXPIRES_KEY } from "@/lib/constants";

/**
 * Returns the active stream URL for all visitors.
 * Resolution order:
 *   1. Manual `stream_url` set by an admin (always wins).
 *   2. Auto-detected `stream_auto_url`, valid until `stream_auto_expires_at`.
 * Subscribes to realtime updates so changes propagate to every visitor.
 */
export function useStreamUrl() {
  const [manualUrl, setManualUrl] = useState<string>("");
  const [autoUrl, setAutoUrl]     = useState<string>("");
  const [autoExpires, setAutoExpires] = useState<string>("");

  useEffect(() => {
    supabase
      .from("settings")
      .select("key, value")
      .in("key", [STREAM_URL_KEY, STREAM_AUTO_URL_KEY, STREAM_AUTO_EXPIRES_KEY])
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value ?? ""]));
        setManualUrl(map[STREAM_URL_KEY] ?? "");
        setAutoUrl(map[STREAM_AUTO_URL_KEY] ?? "");
        setAutoExpires(map[STREAM_AUTO_EXPIRES_KEY] ?? "");
      });

    const channel = supabase
      .channel(`settings-stream-url-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { key: string; value: string };
          if (!row?.key) return;
          if (row.key === STREAM_URL_KEY) setManualUrl(row.value ?? "");
          if (row.key === STREAM_AUTO_URL_KEY) setAutoUrl(row.value ?? "");
          if (row.key === STREAM_AUTO_EXPIRES_KEY) setAutoExpires(row.value ?? "");
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (manualUrl) return manualUrl;
  if (autoUrl && autoExpires) {
    const expiresMs = Date.parse(autoExpires);
    if (!isNaN(expiresMs) && expiresMs > Date.now()) return autoUrl;
  }
  return "";
}
