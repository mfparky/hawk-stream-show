interface YouTubeEmbedProps {
  url: string;
}

const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  // Handle various YouTube URL formats
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

  if (!videoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-muted/30">
        <p className="text-muted-foreground text-lg font-medium" style={{ fontFamily: 'Oswald, sans-serif' }}>
          No live stream set — update the URL in the Admin panel below.
        </p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0`}
        title="Hawks Live Stream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
};

export default YouTubeEmbed;
