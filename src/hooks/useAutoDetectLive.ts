import { useEffect, useRef } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from "@/lib/supabase";
import { STREAM_AUTO_URL_KEY, STREAM_AUTO_EXPIRES_KEY } from "@/lib/constants";

const STREAM_TTL_MS = 2.5 * 60 * 60 * 1000;
const POLL_MS = 90_000; // 90s
// Auto-poll window: from 20 min before scheduled start to 4 hours after.
const PRE_GAME_MS = 20 * 60 * 1000;
const POST_GAME_MS = 4 * 60 * 60 * 1000;
// Fallback when no scheduled game is known: poll if user is on page (light cadence).
const FALLBACK_POLL_MS = 5 * 60 * 1000; // 5 min

/**
 * Automatically detects a YouTube live stream and writes it to settings so
 * every visitor sees it without having to click "Check for live stream".
 *
 * To keep the YouTube quota safe (search.list = 100 units/call), polling is
 * only active within a window around the next scheduled game, or at a slow
 * 5-min cadence when no schedule is known and there is no active stream yet.
 */
export function useAutoDetectLive(
  channelId: string | null,
  hasActiveStream: boolean,
  nextGameAt: Date | null,
) {
  const inFlight = useRef(false);

  useEffect(() => {
    if (!channelId || hasActiveStream) return;

    const check = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const url = `${SUPABASE_URL}/functions/v1/youtube-proxy?action=live&channelId=${encodeURIComponent(channelId)}`;
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });
        if (!res.ok) return;
        const json = await res.json();
        const videoId: string | null = json?.items?.[0]?.id?.videoId ?? null;
        if (!videoId) return;
        const streamUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const expiresAt = new Date(Date.now() + STREAM_TTL_MS).toISOString();
        await supabase
          .from("settings")
          .upsert(
            [
              { key: STREAM_AUTO_URL_KEY, value: streamUrl },
              { key: STREAM_AUTO_EXPIRES_KEY, value: expiresAt },
            ],
            { onConflict: "key" },
          );
        console.info("[useAutoDetectLive] Found live stream", videoId);
      } catch (e) {
        console.warn("[useAutoDetectLive] check failed", e);
      } finally {
        inFlight.current = false;
      }
    };

    const tick = () => {
      const now = Date.now();
      const startMs = nextGameAt?.getTime();
      const inGameWindow =
        !!startMs && now >= startMs - PRE_GAME_MS && now <= startMs + POST_GAME_MS;
      if (inGameWindow) {
        check();
        return POLL_MS;
      }
      // Out of window: only poll on a slow fallback cadence
      check();
      return FALLBACK_POLL_MS;
    };

    // Run once immediately, then schedule adaptive interval
    let timer: number | undefined;
    const loop = () => {
      const delay = tick();
      timer = window.setTimeout(loop, delay);
    };
    loop();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [channelId, hasActiveStream, nextGameAt?.getTime()]);
}
