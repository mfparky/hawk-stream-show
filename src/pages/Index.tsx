import { useState, useEffect } from "react";
import GameChangerWidget from "@/components/GameChangerWidget";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import SubscribeBanner from "@/components/SubscribeBanner";
import { supabase } from "@/lib/supabase";

const STREAM_URL_KEY = "stream_url";

const Index = () => {
  const [streamUrl, setStreamUrl] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    // Load initial value from Supabase
    supabase.
    from("settings").
    select("value").
    eq("key", STREAM_URL_KEY).
    single().
    then(({ data }) => {
      if (data) setStreamUrl(data.value);
      setSettingsLoaded(true);
    });

    // Subscribe to realtime updates so all viewers see URL changes live
    const channel = supabase.
    channel("settings-stream-url").
    on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "settings",
        filter: `key=eq.${STREAM_URL_KEY}`
      },
      (payload) => {
        setStreamUrl((payload.new as {value: string;}).value);
      }
    ).
    subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header — compact to give max room to the stream */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src="/favicon.ico" alt="Newmarket Hawks" className="h-8 w-8 shrink-0 brightness-0 invert" onError={(e) => {e.currentTarget.style.display = 'none';}} />
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-primary leading-none">
              Newmarket Hawks
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
              ⚾ Live Baseball
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-3 py-4 space-y-4 sm:px-4 md:px-6">
        {/* Notice tile — shown when no stream is active */}
        {settingsLoaded && !streamUrl &&
        <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium text-muted-foreground text-center text-lg">
              Live stream will load closer to game time. See schedule below.
            </p>
          </div>
        }

        {/* Live Stream — only rendered when admin has set a stream URL */}
        {settingsLoaded && streamUrl && <YouTubeEmbed url={streamUrl} />}

        {/* Score + Subscribe — compact strip below the stream */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Schedule &amp; Scores
              </p>
              <GameChangerWidget />
            </div>
          </div>
          <div className="md:col-span-1">
            <SubscribeBanner />
          </div>
        </div>
      </main>
    </div>);

};

export default Index;