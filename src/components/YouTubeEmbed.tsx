import { useEffect, useRef, useState } from "react";

interface YouTubeEmbedProps {
  url: string;
}

const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-10 w-10 fill-white drop-shadow" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const YouTubeEmbed = ({ url }: YouTubeEmbedProps) => {
  const videoId = extractVideoId(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [playerActive, setPlayerActive] = useState(false);

  // Reset states whenever the URL changes
  useEffect(() => {
    setEmbedBlocked(false);
    setPlayerActive(false);
  }, [url]);

  // YouTube posts a message when embedding is disabled (error codes 101 / 150)
  useEffect(() => {
    if (!videoId) return;
    const handler = (event: MessageEvent) => {
      if (!event.origin.includes("youtube.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "infoDelivery" && (data?.info?.errorCode === 150 || data?.info?.errorCode === 101)) {
          setEmbedBlocked(true);
        }
      } catch {
        // ignore parse errors
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [videoId]);

  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;

  if (!videoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-muted/30">
        <p className="text-muted-foreground text-lg font-large" style={{ fontFamily: "Oswald, sans-serif" }}>
          No live stream set — admin will enable stream closer to game time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {embedBlocked ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-lg border border-border bg-muted/30">
          <p className="text-muted-foreground font-medium">
            This stream can't be embedded — watch it directly on YouTube.
          </p>
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-700 active:bg-red-800"
          >
            Watch on YouTube
          </a>
        </div>
      ) : playerActive ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
            title="Hawks Live Stream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        /*
         * Hawks-branded poster — no YouTube thumbnail.
         * Live-stream thumbnails are black before the stream starts, and
         * every "safe" bg-* class on this dark palette also looks black.
         * A radial gradient anchored to the primary gold is the only reliable
         * way to make this visually distinct from a broken/loading state.
         */
        <button
          type="button"
          onClick={() => setPlayerActive(true)}
          className="stream-poster group flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-primary/50"
          aria-label="Play Hawks live stream"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 shadow-2xl ring-4 ring-red-600/20 transition-all group-hover:scale-105 group-hover:bg-red-700">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-colors group-hover:bg-red-700">
              <PlayIcon />
            </div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary/80" style={{ fontFamily: "Oswald, sans-serif" }}>
              Watch Live Stream
            </p>
          </div>
        </button>
      )}
      <div className="text-right">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
        >
          Watch on YouTube ↗
        </a>
      </div>
    </div>
  );
};

export default YouTubeEmbed;
