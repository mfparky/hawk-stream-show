import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  SCORE_ENABLED_KEY,
  SCORE_HOME_TEAM_KEY,
  SCORE_AWAY_TEAM_KEY,
  SCORE_HOME_SCORE_KEY,
  SCORE_AWAY_SCORE_KEY,
  SCORE_STATUS_KEY,
} from "@/lib/constants";

export interface ScoreSettings {
  enabled:   boolean;
  homeTeam:  string;
  awayTeam:  string;
  homeScore: number;
  awayScore: number;
  status:    string;
}

const KEYS = [
  SCORE_ENABLED_KEY,
  SCORE_HOME_TEAM_KEY,
  SCORE_AWAY_TEAM_KEY,
  SCORE_HOME_SCORE_KEY,
  SCORE_AWAY_SCORE_KEY,
  SCORE_STATUS_KEY,
];

function parseState(data: { key: string; value: string | null }[]): ScoreSettings {
  const map = Object.fromEntries(data.map((r) => [r.key, r.value ?? ""]));
  return {
    enabled:   map[SCORE_ENABLED_KEY] === "true",
    homeTeam:  map[SCORE_HOME_TEAM_KEY]  || "",
    awayTeam:  map[SCORE_AWAY_TEAM_KEY]  || "",
    homeScore: parseInt(map[SCORE_HOME_SCORE_KEY] || "0", 10) || 0,
    awayScore: parseInt(map[SCORE_AWAY_SCORE_KEY] || "0", 10) || 0,
    status:    map[SCORE_STATUS_KEY]     || "",
  };
}

export function useScoreSettings(): ScoreSettings {
  const [state, setState] = useState<ScoreSettings>({
    enabled:   false,
    homeTeam:  "",
    awayTeam:  "",
    homeScore: 0,
    awayScore: 0,
    status:    "",
  });

  useEffect(() => {
    const load = () =>
      supabase
        .from("settings")
        .select("key, value")
        .in("key", KEYS)
        .then(({ data }) => {
          if (data) setState(parseState(data));
        });

    load();

    const channel = supabase
      .channel("score-settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings" },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return state;
}
