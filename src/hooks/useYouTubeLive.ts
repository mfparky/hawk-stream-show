import { useQuery } from "@tanstack/react-query";

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;

/**
 * Polls the YouTube Data API v3 every 60 s to find the active live stream
 * for a given channel.  Returns the videoId string when live, null otherwise.
 *
 * Requires VITE_YOUTUBE_API_KEY to be set; returns null silently when it isn't.
 */
async function fetchLiveVideoId(channelId: string): Promise<string | null> {
  if (!API_KEY || !channelId) return null;
  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?channelId=${encodeURIComponent(channelId)}` +
    `&eventType=live&type=video&part=id&maxResults=1` +
    `&key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[useYouTubeLive] API error", res.status, body);
    return null;
  }
  const json = await res.json();
  const videoId = json?.items?.[0]?.id?.videoId ?? null;
  if (!videoId) console.info("[useYouTubeLive] No live stream found for channel", channelId);
  return videoId;
}

export function useYouTubeLive(channelId: string | null) {
  console.debug("[useYouTubeLive] state", { channelId, hasApiKey: !!API_KEY, enabled: !!channelId && !!API_KEY });
  const { data: videoId = null } = useQuery({
    queryKey: ["yt-live", channelId],
    queryFn: () => fetchLiveVideoId(channelId!),
    enabled: !!channelId && !!API_KEY,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  return videoId;
}
