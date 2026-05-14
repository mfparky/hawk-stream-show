import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Polls every 60 s for the active live stream on a YouTube channel.
 * Calls the `youtube-proxy` edge function so the browser never hits
 * referrer-restricted Google API endpoints directly.
 */
async function fetchLiveVideoId(channelId: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("youtube-proxy", {
    method: "GET",
  } as never).catch(() => ({ data: null, error: "invoke-failed" } as const));

  // supabase.functions.invoke does not pass query params; use fetch directly.
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-proxy?action=live&channelId=${encodeURIComponent(channelId)}`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error("[useYouTubeLive] proxy error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = await res.json();
  const videoId = json?.items?.[0]?.id?.videoId ?? null;
  if (!videoId) console.info("[useYouTubeLive] No live stream found for channel", channelId);
  return videoId;
}

export function useYouTubeLive(channelId: string | null, _apiKey?: string | null) {
  const enabled = !!channelId;
  const { data: videoId = null } = useQuery({
    queryKey: ["yt-live", channelId],
    queryFn: () => fetchLiveVideoId(channelId!),
    enabled,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  return videoId;
}
