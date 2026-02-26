import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STREAM_URL_KEY } from "@/lib/constants";

/**
 * Loads the live stream URL from Supabase and subscribes to realtime updates
 * so every viewer sees URL changes the moment an admin saves them.
 */
export function useStreamUrl() {
  const [streamUrl, setStreamUrl] = useState<string>("");

  useEffect(() => {
    supabase
      .from("settings")
      .select("value")
      .eq("key", STREAM_URL_KEY)
      .single()
      .then(({ data }) => {
        if (data) setStreamUrl(data.value);
      });

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

    return () => { supabase.removeChannel(channel); };
  }, []);

  return streamUrl;
}
