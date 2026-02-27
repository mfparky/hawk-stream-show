import { useEffect, useState } from "react";

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

const YouTubeEmbed = ({ url }: YouTubeEmbedProps) => {
  const videoId = extractVideoId(url);
  const [isPlaying, setIsPlaying] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(false);

  // Reset state whenever the URL changes
  useEffect(() => {
    setIsPlaying(false);
    setEmbedBlocked(false);
  }, [url]);

  // YouTube posts a message when embedding is disabled (error codes 101 / 150)
  useEffect(() => {
    if (!isPlaying || !videoId) return;
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
  }, [isPlaying, videoId]);

  const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  if (!videoId) {
    return (
      <div className="flex aspect-[32/9] w-full items-center justify-center rounded-lg border border-border bg-muted/30 px-6 text-center">
        <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl font-semibold">
          No stream currently available.<br />Please check again closer to game time.
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
      ) : isPlaying ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
            title="Hawks Live Stream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsPlaying(true)}
          className="group relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-black"
          aria-label="Play stream"
        >
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Stream thumbnail"
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
          )}
          {/* Play button */}
          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110 group-active:scale-95">
            <svg viewBox="0 0 24 24" fill="white" className="h-7 w-7 translate-x-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
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
