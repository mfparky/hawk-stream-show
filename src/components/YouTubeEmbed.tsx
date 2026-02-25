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

const YouTubeEmbed = ({ url }: YouTubeEmbedProps) => {
  const videoId = extractVideoId(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedBlocked, setEmbedBlocked] = useState(false);

  // Reset blocked state whenever the URL changes
  useEffect(() => {
    setEmbedBlocked(false);
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
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-muted/30 px-6 text-center">
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
      ) : (
        <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=0&enablejsapi=1`}
            title="Hawks Live Stream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
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
