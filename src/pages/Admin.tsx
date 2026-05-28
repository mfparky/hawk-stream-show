import { useState, useEffect } from "react";
import AdminPanel, { AdminSettings } from "@/components/AdminPanel";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import {
  STREAM_URL_KEY,
  CHANNEL_ID_KEY,
  YOUTUBE_API_KEY_KEY,
  YOUTUBE_PLAYLIST_ID_KEY,
  VENUE_NAME_KEY,
  VENUE_ADDRESS_KEY,
  VENUE_LAT_KEY,
  VENUE_LON_KEY,
  SCORE_ENABLED_KEY,
  SCORE_HOME_TEAM_KEY,
  SCORE_AWAY_TEAM_KEY,
  SCORE_HOME_SCORE_KEY,
  SCORE_AWAY_SCORE_KEY,
  SCORE_STATUS_KEY,
  RTMP_INGEST_URL_KEY,
  RTMP_STREAM_KEY_KEY,
  YOUTUBE_STUDIO_URL_KEY,
  DEST_YOUTUBE_URL_KEY,
  DEST_YOUTUBE_STREAM_KEY,
  DEST_GC_URL_KEY,
  DEST_GC_STREAM_KEY,
  NTFY_TOPIC_KEY,
} from "@/lib/constants";
import { Link } from "react-router-dom";
import { ArrowLeft, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PASSPHRASE = "hawksflytogether";
const SESSION_KEY = "admin_unlocked";

const KEYS = [
  STREAM_URL_KEY, CHANNEL_ID_KEY, YOUTUBE_API_KEY_KEY, YOUTUBE_PLAYLIST_ID_KEY,
  VENUE_NAME_KEY, VENUE_ADDRESS_KEY, VENUE_LAT_KEY, VENUE_LON_KEY,
  SCORE_ENABLED_KEY, SCORE_HOME_TEAM_KEY, SCORE_AWAY_TEAM_KEY,
  SCORE_HOME_SCORE_KEY, SCORE_AWAY_SCORE_KEY, SCORE_STATUS_KEY,
  RTMP_INGEST_URL_KEY, RTMP_STREAM_KEY_KEY, YOUTUBE_STUDIO_URL_KEY,
  DEST_YOUTUBE_URL_KEY, DEST_YOUTUBE_STREAM_KEY, DEST_GC_URL_KEY, DEST_GC_STREAM_KEY,
  NTFY_TOPIC_KEY,
];

const Admin = () => {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [phrase, setPhrase]     = useState("");
  const [failed, setFailed]     = useState(false);

  const attempt = () => {
    if (phrase.trim().toLowerCase() === PASSPHRASE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setUnlocked(true);
    } else {
      setFailed(true);
      setPhrase("");
    }
  };

  const [settings, setSettings] = useState<AdminSettings>({
    streamUrl:        "",
    channelId:        "",
    youtubeApiKey:    "",
    youtubePlaylistId:"",
    venueName:        "",
    venueAddress:     "",
    venueLat:         "",
    venueLon:         "",
    scoreEnabled:     "",
    scoreHomeTeam:    "",
    scoreAwayTeam:    "",
    scoreHomeScore:   "",
    scoreAwayScore:   "",
    scoreStatus:      "",
    rtmpIngestUrl:    "",
    rtmpStreamKey:    "",
    youtubeStudioUrl: "",
    destYoutubeUrl:   "",
    destYoutubeKey:   "",
    destGcUrl:        "",
    destGcKey:        "",
    ntfyTopic:        "",
  });

  useEffect(() => {
    if (!unlocked) return;
    supabase
      .from("settings")
      .select("key, value")
      .in("key", KEYS)
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        setSettings({
          streamUrl:      map[STREAM_URL_KEY]       ?? "",
          channelId:      map[CHANNEL_ID_KEY]       ?? "",
          youtubeApiKey:  map[YOUTUBE_API_KEY_KEY]  ?? "",
          youtubePlaylistId: map[YOUTUBE_PLAYLIST_ID_KEY] ?? "",
          venueName:      map[VENUE_NAME_KEY]       ?? "",
          venueAddress:   map[VENUE_ADDRESS_KEY]    ?? "",
          venueLat:       map[VENUE_LAT_KEY]        ?? "",
          venueLon:       map[VENUE_LON_KEY]        ?? "",
          scoreEnabled:   map[SCORE_ENABLED_KEY]    ?? "",
          scoreHomeTeam:  map[SCORE_HOME_TEAM_KEY]  ?? "",
          scoreAwayTeam:  map[SCORE_AWAY_TEAM_KEY]  ?? "",
          scoreHomeScore: map[SCORE_HOME_SCORE_KEY] ?? "",
          scoreAwayScore: map[SCORE_AWAY_SCORE_KEY] ?? "",
          scoreStatus:      map[SCORE_STATUS_KEY]        ?? "",
          rtmpIngestUrl:    map[RTMP_INGEST_URL_KEY]     ?? "",
          rtmpStreamKey:    map[RTMP_STREAM_KEY_KEY]     ?? "",
          youtubeStudioUrl: map[YOUTUBE_STUDIO_URL_KEY]  ?? "",
          destYoutubeUrl:   map[DEST_YOUTUBE_URL_KEY]    ?? "",
          destYoutubeKey:   map[DEST_YOUTUBE_STREAM_KEY] ?? "",
          destGcUrl:        map[DEST_GC_URL_KEY]         ?? "",
          destGcKey:        map[DEST_GC_STREAM_KEY]      ?? "",
          ntfyTopic:        map[NTFY_TOPIC_KEY]          ?? "",
        });
      });
  }, [unlocked]);

  // Maps each AdminSettings field to its Supabase settings.key.
  // Lets the panel save only the fields it touched (so the score +/- buttons
  // never accidentally publish a half-typed destination key, etc).
  const KEY_MAP: Record<keyof AdminSettings, string> = {
    streamUrl:        STREAM_URL_KEY,
    channelId:        CHANNEL_ID_KEY,
    youtubeApiKey:    YOUTUBE_API_KEY_KEY,
    youtubePlaylistId:YOUTUBE_PLAYLIST_ID_KEY,
    venueName:        VENUE_NAME_KEY,
    venueAddress:     VENUE_ADDRESS_KEY,
    venueLat:         VENUE_LAT_KEY,
    venueLon:         VENUE_LON_KEY,
    scoreEnabled:     SCORE_ENABLED_KEY,
    scoreHomeTeam:    SCORE_HOME_TEAM_KEY,
    scoreAwayTeam:    SCORE_AWAY_TEAM_KEY,
    scoreHomeScore:   SCORE_HOME_SCORE_KEY,
    scoreAwayScore:   SCORE_AWAY_SCORE_KEY,
    scoreStatus:      SCORE_STATUS_KEY,
    rtmpIngestUrl:    RTMP_INGEST_URL_KEY,
    rtmpStreamKey:    RTMP_STREAM_KEY_KEY,
    youtubeStudioUrl: YOUTUBE_STUDIO_URL_KEY,
    destYoutubeUrl:   DEST_YOUTUBE_URL_KEY,
    destYoutubeKey:   DEST_YOUTUBE_STREAM_KEY,
    destGcUrl:        DEST_GC_URL_KEY,
    destGcKey:        DEST_GC_STREAM_KEY,
    ntfyTopic:        NTFY_TOPIC_KEY,
  };

  const handleSave = async (partial: Partial<AdminSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    const rows = Object.entries(partial)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => ({
        key:        KEY_MAP[k as keyof AdminSettings],
        value:      v,
        updated_at: new Date().toISOString(),
      }));
    if (rows.length === 0) return;
    await supabase.from("settings").upsert(rows);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background">
        <Header subtitle="Admin Panel" />
        <main className="mx-auto max-w-sm px-4 py-20 flex flex-col items-center gap-6">
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold">Admin access</p>
            <p className="text-sm text-muted-foreground">Enter the passphrase to continue</p>
          </div>
          <div className="w-full space-y-3">
            <Input
              type="password"
              value={phrase}
              onChange={(e) => { setPhrase(e.target.value); setFailed(false); }}
              onKeyDown={(e) => e.key === "Enter" && attempt()}
              placeholder="passphrase…"
              className={failed ? "border-destructive" : ""}
              autoFocus
            />
            {failed && (
              <p className="text-xs text-destructive text-center">Incorrect passphrase — try again</p>
            )}
            <Button className="w-full" onClick={attempt}>Unlock</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Admin Panel" />

      <main className="mx-auto max-w-2xl px-4 py-4 sm:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to stream
          </Link>
          <Link
            to="/relay"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Radio className="h-4 w-4" />
            Stream monitor
          </Link>
        </div>

        <AdminPanel settings={settings} onSave={handleSave} />
      </main>
    </div>
  );
};

export default Admin;
