import { useState, useEffect } from "react";
import AdminPanel, { AdminSettings } from "@/components/AdminPanel";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import {
  STREAM_URL_KEY,
  CHANNEL_ID_KEY,
  VENUE_NAME_KEY,
  VENUE_ADDRESS_KEY,
  VENUE_LAT_KEY,
  VENUE_LON_KEY,
} from "@/lib/constants";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const KEYS = [STREAM_URL_KEY, CHANNEL_ID_KEY, VENUE_NAME_KEY, VENUE_ADDRESS_KEY, VENUE_LAT_KEY, VENUE_LON_KEY];

const Admin = () => {
  const [settings, setSettings] = useState<AdminSettings>({
    streamUrl:    "",
    channelId:    "",
    venueName:    "",
    venueAddress: "",
    venueLat:     "",
    venueLon:     "",
  });

  useEffect(() => {
    supabase
      .from("settings")
      .select("key, value")
      .in("key", KEYS)
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        setSettings({
          streamUrl:    map[STREAM_URL_KEY]    ?? "",
          channelId:    map[CHANNEL_ID_KEY]    ?? "",
          venueName:    map[VENUE_NAME_KEY]    ?? "",
          venueAddress: map[VENUE_ADDRESS_KEY] ?? "",
          venueLat:     map[VENUE_LAT_KEY]     ?? "",
          venueLon:     map[VENUE_LON_KEY]     ?? "",
        });
      });
  }, []);

  const handleSave = async (next: AdminSettings) => {
    setSettings(next);
    const rows = [
      { key: STREAM_URL_KEY,    value: next.streamUrl    },
      { key: CHANNEL_ID_KEY,    value: next.channelId    },
      { key: VENUE_NAME_KEY,    value: next.venueName    },
      { key: VENUE_ADDRESS_KEY, value: next.venueAddress },
      { key: VENUE_LAT_KEY,     value: next.venueLat     },
      { key: VENUE_LON_KEY,     value: next.venueLon     },
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));

    await supabase.from("settings").upsert(rows);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Admin Panel" />

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
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
