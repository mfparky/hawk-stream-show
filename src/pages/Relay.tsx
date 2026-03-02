import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Wifi, WifiOff, Radio,
  ChevronDown, Minus, Plus, Settings, Copy, Check as CheckIcon,
} from "lucide-react";
import { useRtmpStats } from "@/hooks/useRtmpStats";
import { useOperatorSettings } from "@/hooks/useOperatorSettings";
import { supabase } from "@/lib/supabase";
import {
  SCORE_ENABLED_KEY,
  SCORE_HOME_TEAM_KEY,
  SCORE_AWAY_TEAM_KEY,
  SCORE_HOME_SCORE_KEY,
  SCORE_AWAY_SCORE_KEY,
  SCORE_STATUS_KEY,
} from "@/lib/constants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ── Score ─────────────────────────────────────────────────────────────────────
interface Score {
  homeTeam: string; awayTeam: string;
  homeScore: number; awayScore: number;
  status: string; enabled: boolean;
}
const SCORE_KEYS = [
  SCORE_ENABLED_KEY, SCORE_HOME_TEAM_KEY, SCORE_AWAY_TEAM_KEY,
  SCORE_HOME_SCORE_KEY, SCORE_AWAY_SCORE_KEY, SCORE_STATUS_KEY,
];
function useScore() {
  const [score, setScore] = useState<Score>({
    homeTeam: "", awayTeam: "", homeScore: 0, awayScore: 0, status: "", enabled: false,
  });
  const load = useCallback(async () => {
    const { data } = await supabase.from("settings").select("key, value").in("key", SCORE_KEYS);
    if (!data) return;
    const map = Object.fromEntries(data.map((r) => [r.key, r.value ?? ""]));
    setScore({
      enabled:   map[SCORE_ENABLED_KEY] === "true",
      homeTeam:  map[SCORE_HOME_TEAM_KEY]  || "Home",
      awayTeam:  map[SCORE_AWAY_TEAM_KEY]  || "Away",
      homeScore: parseInt(map[SCORE_HOME_SCORE_KEY] || "0", 10) || 0,
      awayScore: parseInt(map[SCORE_AWAY_SCORE_KEY] || "0", 10) || 0,
      status:    map[SCORE_STATUS_KEY]     || "",
    });
  }, []);
  useEffect(() => {
    load();
    const ch = supabase.channel("relay-score")
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);
  const adjust = async (field: "homeScore" | "awayScore", delta: number) => {
    const next = { ...score, [field]: Math.max(0, score[field] + delta) };
    setScore(next);
    const key = field === "homeScore" ? SCORE_HOME_SCORE_KEY : SCORE_AWAY_SCORE_KEY;
    await supabase.from("settings").upsert([
      { key, value: String(next[field]), updated_at: new Date().toISOString() },
    ]);
  };
  return { score, adjust };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function bps(bytes: number) {
  const kbps = (bytes * 8) / 1000;
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} Kbps`;
}
function timeAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

// ── Status dot ────────────────────────────────────────────────────────────────
function Dot({ on, pulse }: { on: boolean; pulse?: boolean }) {
  return (
    <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full ${on ? "bg-green-500" : "bg-red-500"} ${pulse && on ? "animate-ping opacity-75" : ""}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${on ? "bg-green-500" : "bg-red-500"}`} />
    </span>
  );
}

// ── Score stepper ─────────────────────────────────────────────────────────────
function Stepper({ label, value, onMinus, onPlus }: {
  label: string; value: number; onMinus: () => void; onPlus: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm font-medium text-muted-foreground w-24 truncate">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={onMinus} className="h-11 w-11 rounded-full border border-border bg-card flex items-center justify-center active:bg-accent transition-colors">
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-2xl font-bold tabular-nums">{value}</span>
        <button onClick={onPlus} className="h-11 w-11 rounded-full border border-border bg-card flex items-center justify-center active:bg-accent transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Copy-to-clipboard button ───────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const Relay = () => {
  const { stats, rawXml, error, loading, statsUrl, saveUrl, refetch } = useRtmpStats();
  const { score, adjust } = useScore();
  const op = useOperatorSettings();

  const [urlDraft, setUrlDraft] = useState(statsUrl);
  const [tick, setTick] = useState(0);

  // Tick every second so "time ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;

  const isLive      = stats?.live ?? false;
  const pushCount   = stats?.pushCount ?? 0;
  const mevoConnected = stats?.srcConnected ?? false;
  const youtubeActive = pushCount >= 1;
  const gcActive      = pushCount >= 2;
  const allGood       = mevoConnected && youtubeActive && gcActive;

  const handleSaveUrl = () => saveUrl(urlDraft.trim());

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
          <span className="text-sm font-semibold">Stream Monitor</span>
          <button
            onClick={refetch}
            className="flex items-center gap-1 text-xs text-muted-foreground active:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-5 space-y-4">

        {/* ── No URL configured — show setup prompt prominently ── */}
        {!statsUrl && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              Relay server not configured
            </p>
            <p className="text-xs text-muted-foreground">
              Enter your relay's stats URL to start monitoring (e.g.{" "}
              <code className="font-mono">http://138.197.140.107:8080/stat</code>).
            </p>
            <div className="flex gap-2">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="http://SERVER_IP:8080/stat"
                className="font-mono text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleSaveUrl()}
              />
              <Button size="sm" onClick={handleSaveUrl} disabled={!urlDraft.trim()} className="shrink-0">
                Set
              </Button>
            </div>
          </div>
        )}

        {/* ── Overall status ── */}
        <div className={`rounded-xl border p-5 flex items-center justify-between transition-colors ${
          allGood ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"
        }`}>
          <div className="flex items-center gap-3">
            {isLive
              ? <Radio className="h-6 w-6 text-green-500" />
              : <WifiOff className="h-6 w-6 text-muted-foreground" />}
            <div>
              <p className={`text-2xl font-bold tracking-tight ${isLive ? "text-green-500" : "text-muted-foreground"}`}>
                {isLive ? "LIVE" : "OFFLINE"}
              </p>
              {stats && stats.bwIn > 0 && (
                <p className="text-xs text-muted-foreground">
                  {stats.width > 0 ? `${stats.width}×${stats.height} · ` : ""}{bps(stats.bwIn)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            {stats && <p className="text-xs text-muted-foreground">{timeAgo(stats.fetchedAt)}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        {/* ── Signal health — always visible ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Wifi className="h-3 w-3" /> Source
            </div>
            <div className="flex items-center gap-2">
              <Dot on={mevoConnected} pulse />
              <span className="text-sm font-medium">{mevoConnected ? "Mevo" : "No input"}</span>
            </div>
            {stats && stats.bwIn > 0 && (
              <p className="text-sm font-semibold tabular-nums">{bps(stats.bwIn)}</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Radio className="h-3 w-3" /> Destinations
            </div>
            <div className="flex items-center gap-2">
              <Dot on={youtubeActive} pulse />
              <span className="text-sm font-medium">YouTube</span>
            </div>
            <div className="flex items-center gap-2">
              <Dot on={gcActive} pulse />
              <span className="text-sm font-medium">GameChanger</span>
            </div>
          </div>
        </div>

        {/* ── Mevo credentials ── */}
        {(op.rtmpIngestUrl || op.rtmpStreamKey) && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Mevo Setup
            </p>
            {op.rtmpIngestUrl && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">RTMP Server</p>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <code className="text-xs font-mono break-all">{op.rtmpIngestUrl}</code>
                  <CopyButton value={op.rtmpIngestUrl} />
                </div>
              </div>
            )}
            {op.rtmpStreamKey && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Stream Key</p>
                <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                  <code className="text-xs font-mono break-all">{op.rtmpStreamKey}</code>
                  <CopyButton value={op.rtmpStreamKey} />
                </div>
              </div>
            )}
            {op.youtubeStudioUrl && (
              <a
                href={op.youtubeStudioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Radio className="h-3 w-3" /> Open YouTube Studio
              </a>
            )}
          </div>
        )}

        {/* ── Score controls ── */}
        {score.enabled && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Score</p>
            {score.status && (
              <p className="mb-3 text-sm text-muted-foreground">{score.status}</p>
            )}
            <Stepper
              label={score.homeTeam || "Home"}
              value={score.homeScore}
              onMinus={() => adjust("homeScore", -1)}
              onPlus={() => adjust("homeScore", 1)}
            />
            <div className="border-t border-border" />
            <Stepper
              label={score.awayTeam || "Away"}
              value={score.awayScore}
              onMinus={() => adjust("awayScore", -1)}
              onPlus={() => adjust("awayScore", 1)}
            />
          </div>
        )}

        {/* ── Debug — raw response ── */}
        {statsUrl && (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-muted-foreground">
              <span className="text-xs">Raw server response</span>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-xl border border-border bg-card p-3">
                {error && (
                  <p className="text-xs text-destructive font-mono break-all">Error: {error}</p>
                )}
                {rawXml ? (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all overflow-auto max-h-60">
                    {rawXml.slice(0, 2000)}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">{loading ? "Fetching…" : "No response yet"}</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ── Server config ── */}
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-muted-foreground">
            <span className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" /> Relay server URL
            </span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Point this at your RTMP relay's stats endpoint, e.g.{" "}
                <code className="font-mono">http://SERVER_IP:8080/stat</code>
              </p>
              <div className="flex gap-2">
                <Input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="http://138.197.140.107:8080/stat"
                  className="font-mono text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveUrl()}
                />
                <Button size="sm" onClick={handleSaveUrl} className="shrink-0">Set</Button>
              </div>
              {statsUrl && (
                <p className="text-xs text-muted-foreground break-all">
                  Current: <code className="font-mono">{statsUrl}</code>
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

      </main>
    </div>
  );
};

export default Relay;
