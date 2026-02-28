import { useState, useEffect } from "react";
import AdminPanel, { AdminSettings } from "@/components/AdminPanel";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import {
  STREAM_URL_KEY,
  CHANNEL_ID_KEY,
  YOUTUBE_API_KEY_KEY,
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
  GC_TEAM_URL_KEY,
} from "@/lib/constants";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const PASSPHRASE = "hawks fly high swing hard";
const SESSION_KEY = "admin_unlocked";

const KEYS = [
  STREAM_URL_KEY, CHANNEL_ID_KEY, YOUTUBE_API_KEY_KEY,
  VENUE_NAME_KEY, VENUE_ADDRESS_KEY, VENUE_LAT_KEY, VENUE_LON_KEY,
  SCORE_ENABLED_KEY, SCORE_HOME_TEAM_KEY, SCORE_AWAY_TEAM_KEY,
  SCORE_HOME_SCORE_KEY, SCORE_AWAY_SCORE_KEY, SCORE_STATUS_KEY,
  GC_TEAM_URL_KEY,
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
    streamUrl:      "",
    channelId:      "",
    youtubeApiKey:  "",
    venueName:      "",
    venueAddress:   "",
    venueLat:       "",
    venueLon:       "",
    scoreEnabled:   "",
    scoreHomeTeam:  "",
    scoreAwayTeam:  "",
    scoreHomeScore: "",
    scoreAwayScore: "",
    scoreStatus:    "",
    gcTeamUrl:      "",
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
          venueName:      map[VENUE_NAME_KEY]       ?? "",
          venueAddress:   map[VENUE_ADDRESS_KEY]    ?? "",
          venueLat:       map[VENUE_LAT_KEY]        ?? "",
          venueLon:       map[VENUE_LON_KEY]        ?? "",
          scoreEnabled:   map[SCORE_ENABLED_KEY]    ?? "",
          scoreHomeTeam:  map[SCORE_HOME_TEAM_KEY]  ?? "",
          scoreAwayTeam:  map[SCORE_AWAY_TEAM_KEY]  ?? "",
          scoreHomeScore: map[SCORE_HOME_SCORE_KEY] ?? "",
          scoreAwayScore: map[SCORE_AWAY_SCORE_KEY] ?? "",
          scoreStatus:    map[SCORE_STATUS_KEY]     ?? "",
          gcTeamUrl:      map[GC_TEAM_URL_KEY]      ?? "",
        });
      });
  }, [unlocked]);

  const handleSave = async (next: AdminSettings) => {
    setSettings(next);
    const rows = [
      { key: STREAM_URL_KEY,      value: next.streamUrl      },
      { key: CHANNEL_ID_KEY,      value: next.channelId      },
      { key: YOUTUBE_API_KEY_KEY, value: next.youtubeApiKey  },
      { key: VENUE_NAME_KEY,      value: next.venueName      },
      { key: VENUE_ADDRESS_KEY,   value: next.venueAddress   },
      { key: VENUE_LAT_KEY,       value: next.venueLat       },
      { key: VENUE_LON_KEY,       value: next.venueLon       },
      { key: SCORE_ENABLED_KEY,   value: next.scoreEnabled   },
      { key: SCORE_HOME_TEAM_KEY, value: next.scoreHomeTeam  },
      { key: SCORE_AWAY_TEAM_KEY, value: next.scoreAwayTeam  },
      { key: SCORE_HOME_SCORE_KEY,value: next.scoreHomeScore },
      { key: SCORE_AWAY_SCORE_KEY,value: next.scoreAwayScore },
      { key: SCORE_STATUS_KEY,    value: next.scoreStatus    },
      { key: GC_TEAM_URL_KEY,     value: next.gcTeamUrl      },
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));

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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stream
        </Link>

        <AdminPanel settings={settings} onSave={handleSave} />
      </main>
    </div>
  );
};

export default Admin;
