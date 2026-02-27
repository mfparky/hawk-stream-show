import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  SCORE_HOME_SCORE_KEY,
  SCORE_AWAY_SCORE_KEY,
  SCORE_STATUS_KEY,
} from "@/lib/constants";

interface ParsedScore {
  homeScore: number;
  awayScore: number;
  status: string;
}

/**
 * Best-effort parser for the GameChanger schedule widget DOM.
 *
 * GC's widget HTML structure is undocumented and may change at any time.
 * Three strategies are tried in order; all results are logged to the console
 * so the parser can be refined if the widget structure changes.
 *
 * Only scores (home, away) and status are synced — team names stay
 * under admin control.
 */
function parseGCWidget(container: HTMLElement): ParsedScore | null {
  if (!container.innerHTML || container.innerHTML.trim().length < 30) return null;

  const text = (container.innerText ?? container.textContent ?? "").trim();
  console.log("[GC Sync] Widget text:\n", text);

  // ── Strategy 1: home / away class selectors ──────────────────────────────
  // GC often uses class names like "home-score", "homeScore",
  // or a parent with "home" containing a child with "score".
  const homeScoreEl = container.querySelector<HTMLElement>(
    '[class*="home-score"], [class*="homeScore"], [class*="home"] [class*="score"]',
  );
  const awayScoreEl = container.querySelector<HTMLElement>(
    '[class*="away-score"], [class*="awayScore"], [class*="away"] [class*="score"]',
  );
  if (homeScoreEl && awayScoreEl) {
    const hs = parseInt(homeScoreEl.textContent?.trim() ?? "", 10);
    const as = parseInt(awayScoreEl.textContent?.trim() ?? "", 10);
    if (!isNaN(hs) && !isNaN(as)) {
      const status =
        container
          .querySelector('[class*="status"], [class*="period"], [class*="inning"]')
          ?.textContent?.trim() ?? "";
      console.log("[GC Sync] Strategy 1 (home/away classes) matched:", { hs, as, status });
      return { homeScore: hs, awayScore: as, status };
    }
  }

  // ── Strategy 2: any leaf [class*="score"] elements ───────────────────────
  // Picks the first two score-like numbers found in score-classed leaves.
  const scoreNums = Array.from(container.querySelectorAll('[class*="score"]'))
    .filter((el) => el.children.length === 0) // leaf nodes only
    .map((el) => parseInt(el.textContent?.trim() ?? "", 10))
    .filter((n) => !isNaN(n) && n >= 0 && n < 100);
  if (scoreNums.length >= 2) {
    const status =
      container
        .querySelector('[class*="status"], [class*="state"]')
        ?.textContent?.trim() ?? "";
    console.log("[GC Sync] Strategy 2 (score class leaves) matched:", { scoreNums, status });
    return { homeScore: scoreNums[0], awayScore: scoreNums[1], status };
  }

  // ── Strategy 3: "N – N" or "N - N" text pattern ──────────────────────────
  const match = text.match(/\b(\d{1,2})\s*[–\-]\s*(\d{1,2})\b/);
  if (match) {
    const hs = parseInt(match[1], 10);
    const as = parseInt(match[2], 10);
    console.log("[GC Sync] Strategy 3 (dash pattern) matched:", { hs, as });
    return { homeScore: hs, awayScore: as, status: "" };
  }

  // Nothing found — log the raw HTML so we can tune the parser later.
  console.log("[GC Sync] No score detected. Widget HTML:\n", container.innerHTML);
  return null;
}

/**
 * Watches the GameChanger schedule widget DOM and syncs any detected
 * scores to Supabase.  Only runs while `enabled` is true (i.e. the
 * admin has the scoreboard turned on).
 *
 * Uses a 1.5 s debounce so rapid DOM updates (GC re-renders) settle
 * before we attempt to parse.  Duplicate writes are skipped.
 */
export function useGCSync(enabled: boolean) {
  const lastKey = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    let observer: MutationObserver | null = null;
    let debounceTimer: ReturnType<typeof setTimeout>;

    const handleMutation = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const container = document.getElementById("gc-schedule-widget-44s1");
        if (!container) return;

        const parsed = parseGCWidget(container);
        if (!parsed) return;

        // Skip if nothing changed since last write
        const key = `${parsed.homeScore}:${parsed.awayScore}:${parsed.status}`;
        if (key === lastKey.current) return;
        lastKey.current = key;

        const ts = new Date().toISOString();
        const { error } = await supabase.from("settings").upsert([
          { key: SCORE_HOME_SCORE_KEY, value: String(parsed.homeScore), updated_at: ts },
          { key: SCORE_AWAY_SCORE_KEY, value: String(parsed.awayScore), updated_at: ts },
          { key: SCORE_STATUS_KEY,     value: parsed.status,            updated_at: ts },
        ]);

        if (error) {
          console.error("[GC Sync] Supabase write failed:", error);
        } else {
          console.log("[GC Sync] Synced to Supabase:", parsed);
        }
      }, 1500);
    };

    const attach = () => {
      const container = document.getElementById("gc-schedule-widget-44s1");
      if (!container) return false;
      observer = new MutationObserver(handleMutation);
      observer.observe(container, { childList: true, subtree: true, characterData: true });
      return true;
    };

    // The GC widget div may not have mounted yet — retry every 500 ms.
    if (!attach()) {
      const interval = setInterval(() => {
        if (attach()) clearInterval(interval);
      }, 500);
      return () => {
        clearInterval(interval);
        observer?.disconnect();
        clearTimeout(debounceTimer);
      };
    }

    return () => {
      observer?.disconnect();
      clearTimeout(debounceTimer);
    };
  }, [enabled]);
}
