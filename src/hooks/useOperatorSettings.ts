import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  RTMP_INGEST_URL_KEY,
  RTMP_STREAM_KEY_KEY,
  YOUTUBE_STUDIO_URL_KEY,
} from "@/lib/constants";

export interface OperatorSettings {
  rtmpIngestUrl:    string;
  rtmpStreamKey:    string;
  youtubeStudioUrl: string;
}

const KEYS = [RTMP_INGEST_URL_KEY, RTMP_STREAM_KEY_KEY, YOUTUBE_STUDIO_URL_KEY];

export function useOperatorSettings(): OperatorSettings {
  const [state, setState] = useState<OperatorSettings>({
    rtmpIngestUrl:    "",
    rtmpStreamKey:    "",
    youtubeStudioUrl: "",
  });

  useEffect(() => {
    supabase
      .from("settings")
      .select("key, value")
      .in("key", KEYS)
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((r) => [r.key, r.value ?? ""]));
        setState({
          rtmpIngestUrl:    map[RTMP_INGEST_URL_KEY]    || "",
          rtmpStreamKey:    map[RTMP_STREAM_KEY_KEY]    || "",
          youtubeStudioUrl: map[YOUTUBE_STUDIO_URL_KEY] || "",
        });
      });
  }, []);

  return state;
}
