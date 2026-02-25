import { useState, useEffect } from "react";
import Header from "@/components/Header";
import GameChangerWidget from "@/components/GameChangerWidget";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import SubscribeBanner from "@/components/SubscribeBanner";
import { supabase } from "@/lib/supabase";

const STREAM_URL_KEY = "stream_url";

const Index = () => {
  const [streamUrl, setStreamUrl] = useState("");

  useEffect(() => {
    // Load initial value from Supabase
    supabase
      .from("settings")
      .select("value")
      .eq("key", STREAM_URL_KEY)
      .single()
      .then(({ data }) => {
        if (data) setStreamUrl(data.value);
      });

    // Subscribe to realtime updates so all viewers see URL changes live
    const channel = supabase
      .channel("settings-stream-url")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "settings",
          filter: `key=eq.${STREAM_URL_KEY}`,
        },
        (payload) => {
          setStreamUrl((payload.new as { value: string }).value);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-3 py-4 space-y-4 sm:px-4 md:px-6">
        {/* Live Stream — hero, full width */}
        <YouTubeEmbed url={streamUrl} />

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
    </div>
  );
};

export default Index;
