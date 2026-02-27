import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  CHANNEL_ID_KEY,
  YOUTUBE_API_KEY_KEY,
  VENUE_NAME_KEY,
  VENUE_ADDRESS_KEY,
  VENUE_LAT_KEY,
  VENUE_LON_KEY,
} from "@/lib/constants";

export interface VenueSettings {
  channelId:     string | null;
  youtubeApiKey: string | null;
  venueName:     string | null;
  venueAddress:  string | null;
  venueLat:      number | null;
  venueLon:      number | null;
}

const KEYS = [CHANNEL_ID_KEY, YOUTUBE_API_KEY_KEY, VENUE_NAME_KEY, VENUE_ADDRESS_KEY, VENUE_LAT_KEY, VENUE_LON_KEY];

export function useVenueSettings(): VenueSettings {
  const [state, setState] = useState<VenueSettings>({
    channelId:     null,
    youtubeApiKey: null,
    venueName:     null,
    venueAddress:  null,
    venueLat:      null,
    venueLon:      null,
  });

  useEffect(() => {
    supabase
      .from("settings")
      .select("key, value")
      .in("key", KEYS)
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value ?? ""]));
        const lat = parseFloat(map[VENUE_LAT_KEY]);
        const lon = parseFloat(map[VENUE_LON_KEY]);
        setState({
          channelId:     map[CHANNEL_ID_KEY]      || null,
          youtubeApiKey: map[YOUTUBE_API_KEY_KEY] || null,
          venueName:     map[VENUE_NAME_KEY]      || null,
          venueAddress:  map[VENUE_ADDRESS_KEY]   || null,
          venueLat:      isNaN(lat) ? null : lat,
          venueLon:      isNaN(lon) ? null : lon,
        });
      });
  }, []);

  return state;
}
