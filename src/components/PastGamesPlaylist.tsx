import { useQuery } from "@tanstack/react-query";

interface PlaylistItem {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

async function fetchPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-proxy?action=playlist&playlistId=${encodeURIComponent(playlistId)}`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error("[PastGamesPlaylist] API error", res.status, await res.text().catch(() => ""));
    return [];
  }
  const json = await res.json();
  const items = (json?.items ?? []) as Array<{
    snippet: {
      title: string;
      publishedAt: string;
      resourceId: { videoId: string };
      thumbnails: { medium?: { url: string }; high?: { url: string }; default?: { url: string } };
    };
  }>;
  return items
    .filter((i) => i.snippet?.title !== "Private video" && i.snippet?.title !== "Deleted video")
    .map((i) => ({
      videoId: i.snippet.resourceId.videoId,
      title: i.snippet.title,
      thumbnail:
        i.snippet.thumbnails.medium?.url ||
        i.snippet.thumbnails.high?.url ||
        i.snippet.thumbnails.default?.url ||
        "",
      publishedAt: i.snippet.publishedAt,
    }));
}

interface Props {
  playlistId: string | null;
  apiKey: string | null;
  onSelect?: (videoId: string) => void;
  activeVideoId?: string | null;
}

const PastGamesPlaylist = ({ playlistId, apiKey, onSelect, activeVideoId }: Props) => {
  const enabled = !!playlistId;
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["yt-playlist", playlistId],
    queryFn: () => fetchPlaylistItems(playlistId!),
    enabled,
    staleTime: 10 * 60_000,
  });

  if (!enabled || (!isLoading && items.length === 0)) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Past Games
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 snap-x snap-mandatory">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-56 aspect-video rounded-lg bg-muted/40 animate-pulse snap-start"
              />
            ))
          : items.map((item) => {
              const isActive = activeVideoId === item.videoId;
              const commonInner = (
                <>
                  <div className={`relative aspect-video overflow-hidden rounded-lg border bg-black ${isActive ? "border-primary ring-2 ring-primary" : "border-border"}`}>
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    )}
                    <div className={`absolute inset-0 flex items-center justify-center transition-opacity bg-black/30 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 shadow-lg">
                        <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5 translate-x-0.5">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary text-left">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground text-left">
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </p>
                </>
              );
              return onSelect ? (
                <button
                  key={item.videoId}
                  type="button"
                  onClick={() => onSelect(item.videoId)}
                  className="group shrink-0 w-56 snap-start"
                >
                  {commonInner}
                </button>
              ) : (
                <a
                  key={item.videoId}
                  href={`https://www.youtube.com/watch?v=${item.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group shrink-0 w-56 snap-start"
                >
                  {commonInner}
                </a>
              );
            })}
      </div>
    </section>
  );
};

export default PastGamesPlaylist;
