import { useState, useEffect } from "react";
import GameChangerWidget from "@/components/GameChangerWidget";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import AdminPanel from "@/components/AdminPanel";

const STREAM_URL_KEY = "hawks-stream-url";

const Index = () => {
  const [streamUrl, setStreamUrl] = useState(() => {
    return localStorage.getItem(STREAM_URL_KEY) || "";
  });

  useEffect(() => {
    localStorage.setItem(STREAM_URL_KEY, streamUrl);
  }, [streamUrl]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 py-5">
          <div className="text-center">
            <h1 className="text-4xl font-bold uppercase tracking-wider text-primary sm:text-5xl">
              Newmarket Hawks
            </h1>
            <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
              ⚾ Baseball
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Schedule / Scoreboard Widget */}
        <section>
          <h2 className="mb-3 text-xl font-semibold uppercase tracking-wide text-primary">
            Schedule &amp; Scores
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card p-4">
            <GameChangerWidget />
          </div>
        </section>

        {/* Live Stream */}
        <section>
          <h2 className="mb-3 text-xl font-semibold uppercase tracking-wide text-primary">
            Live Stream
          </h2>
          <YouTubeEmbed url={streamUrl} />
        </section>

        {/* Admin Panel */}
        <section className="pb-8">
          <AdminPanel streamUrl={streamUrl} onUrlChange={setStreamUrl} />
        </section>
      </main>
    </div>
  );
};

export default Index;
