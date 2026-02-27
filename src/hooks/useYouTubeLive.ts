import { useQuery } from "@tanstack/react-query";

/**
 * Polls the YouTube Data API v3 every 60 s to find the active live stream
 * for a given channel.  Returns the videoId string when live, null otherwise.
 *
 * Both channelId and apiKey are loaded from Supabase settings at runtime.
 */
async function fetchLiveVideoId(channelId: string, apiKey: string): Promise<string | null> {
  const url =
    `https://www.googleapis.com/youtube/v3/search` +
    `?channelId=${encodeURIComponent(channelId)}` +
    `&eventType=live&type=video&part=id&maxResults=1` +
    `&key=${apiKey}`;
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

export function useYouTubeLive(channelId: string | null, apiKey: string | null) {
  const enabled = !!channelId && !!apiKey;
  const { data: videoId = null } = useQuery({
    queryKey: ["yt-live", channelId],
    queryFn: () => fetchLiveVideoId(channelId!, apiKey!),
    enabled,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  return videoId;
}
