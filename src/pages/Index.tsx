import Header from "@/components/Header";
import GameChangerWidget from "@/components/GameChangerWidget";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import WeatherWidget from "@/components/WeatherWidget";
import VenueMap from "@/components/VenueMap";
import ScoreboardWidget from "@/components/ScoreboardWidget";
import { useStreamUrl } from "@/hooks/useStreamUrl";
import { useYouTubeLive } from "@/hooks/useYouTubeLive";
import { useVenueSettings } from "@/hooks/useVenueSettings";
import { useScoreSettings } from "@/hooks/useScoreSettings";
import { useGCSync } from "@/hooks/useGCSync";

const Index = () => {
  const streamUrl    = useStreamUrl();
  const venue        = useVenueSettings();
  const score        = useScoreSettings();

  // Auto-sync scores from the GameChanger widget DOM when the scoreboard is enabled.
  // Falls back silently if the widget HTML doesn't match any known pattern.
  useGCSync(score.enabled);

  // Auto-detect the live stream from the YouTube channel when no manual URL is set
  const autoVideoId  = useYouTubeLive(streamUrl ? null : (venue.channelId || "UCEjeKZZC1HKPVfxQHlS6cqQ"));
  const autoUrl      = autoVideoId ? `https://www.youtube.com/watch?v=${autoVideoId}` : "";

  const activeUrl    = streamUrl || autoUrl;
  const hasVenue     = venue.venueLat !== null && venue.venueLon !== null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-6xl px-3 py-4 space-y-4 sm:px-4 md:px-6">
        {/* Scoreboard — shown above video when enabled by admin */}
        <ScoreboardWidget />

        {/* Live Stream — hero, full width */}
        <YouTubeEmbed url={activeUrl} />

        {/* Schedule | Right column */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Schedule — 2/3 (second on mobile, first on desktop) */}
          <div className="md:col-span-2 order-last md:order-first">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Schedule &amp; Scores
              </p>
              <GameChangerWidget />
            </div>
          </div>

          {/* Right sidebar — 1/3 (first on mobile, last on desktop) */}
          {hasVenue && (
            <div className="md:col-span-1 flex flex-col gap-4 order-first md:order-last">
              <WeatherWidget
                lat={venue.venueLat!}
                lon={venue.venueLon!}
                venueName={venue.venueName!}
              />
              <VenueMap
                lat={venue.venueLat!}
                lon={venue.venueLon!}
                venueName={venue.venueName!}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
