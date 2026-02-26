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
  if (!res.ok) return null;
  const json = await res.json();
  return json?.items?.[0]?.id?.videoId ?? null;
}

export function useYouTubeLive(channelId: string | null) {
  const { data: videoId = null } = useQuery({
    queryKey: ["yt-live", channelId],
    queryFn: () => fetchLiveVideoId(channelId!),
    enabled: !!channelId && !!API_KEY,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  return videoId;
}
