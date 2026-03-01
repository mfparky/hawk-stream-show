import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, Wifi, WifiOff, Radio,
  ChevronDown, Minus, Plus, Settings, Copy, Check,
  ExternalLink, Smartphone, Tv, CircleCheck, Circle,
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

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 shrink-0 text-muted-foreground active:text-foreground transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
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

// ── Checklist step ────────────────────────────────────────────────────────────
function Step({
  done, label, children,
}: { done: boolean; label: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 transition-colors ${done ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        {done
          ? <CircleCheck className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          : <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${done ? "text-green-500" : "text-foreground"}`}>{label}</p>
          {children && <div className="mt-2 space-y-1">{children}</div>}
        </div>
      </div>
    </div>
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

// ── Mono field with copy ──────────────────────────────────────────────────────
function MonoField({ label, value, obscure }: { label: string; value: string; obscure?: boolean }) {
  const [show, setShow] = useState(!obscure);
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <code className="flex-1 font-mono text-sm text-foreground break-all">
          {obscure && !show ? "••••••••" : value}
        </code>
        {obscure && (
          <button onClick={() => setShow((s) => !s)} className="text-xs text-muted-foreground shrink-0">
            {show ? "hide" : "show"}
          </button>
        )}
        <CopyButton value={value} />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
const Relay = () => {
  const { stats, error, loading, statsUrl, saveUrl, refetch } = useRtmpStats();
  const operator = useOperatorSettings();
  const { score, adjust } = useScore();

  const [urlDraft, setUrlDraft] = useState(statsUrl);
  const [tick, setTick] = useState(0);

  // Tick every second so "time ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  void tick;

  const isLive    = stats?.live ?? false;
  const stream    = stats?.stream ?? null;
  const source    = stats?.source ?? null;
  const pushCount = stats?.pushClients.length ?? 0;

  // Checklist derived states
  const mevoConnected   = !!source;
  const youtubeActive   = pushCount >= 1;
  const gcActive        = pushCount >= 2;
  const allGood         = mevoConnected && youtubeActive && gcActive;

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
              {stream && stream.bwIn > 0 && (
                <p className="text-xs text-muted-foreground">
                  {stream.width > 0 ? `${stream.width}×${stream.height} · ` : ""}{bps(stream.bwIn)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            {stats && <p className="text-xs text-muted-foreground">{timeAgo(stats.fetchedAt)}</p>}
            {!statsUrl && <p className="text-xs text-muted-foreground">Configure server below</p>}
            {error && statsUrl && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        {/* ── Game-day startup checklist ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            Game Day Startup
          </p>

          {/* Step 1 — Hotspot (manual) */}
          <Step done={false} label="1 · Enable phone hotspot">
            <p className="text-xs text-muted-foreground">Turn on your hotspot before anything else.</p>
          </Step>

          {/* Step 2 — Mevo Wi-Fi + RTMP config */}
          <Step done={mevoConnected} label="2 · Connect Mevo & start streaming">
            <p className="text-xs text-muted-foreground mb-2">
              Connect the Mevo to your hotspot Wi-Fi, then open the Mevo app and enter:
            </p>
            <div className="rounded-lg border border-border bg-background p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <MonoField label="RTMP Server" value={operator.rtmpIngestUrl} />
                  <MonoField label="Stream Key" value={operator.rtmpStreamKey} obscure />
                  {!operator.rtmpIngestUrl && (
                    <p className="text-xs text-muted-foreground italic">
                      Ask admin to fill in the Mevo settings at /admin
                    </p>
                  )}
                </div>
              </div>
            </div>
            {mevoConnected && source && (
              <p className="text-xs text-green-500 mt-1">
                Connected from {source.address}
              </p>
            )}
          </Step>

          {/* Step 3 — YouTube go live */}
          <Step done={youtubeActive} label="3 · Go live on YouTube Studio">
            <div className="flex items-center gap-2">
              <Tv className="h-4 w-4 text-muted-foreground shrink-0" />
              {operator.youtubeStudioUrl ? (
                <a
                  href={operator.youtubeStudioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
                >
                  Open YouTube Studio <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Open YouTube Studio → Go Live</span>
              )}
            </div>
            {youtubeActive && (
              <p className="text-xs text-green-500 mt-1">YouTube receiving stream</p>
            )}
          </Step>

          {/* Step 4 — GameChanger auto */}
          <Step done={gcActive} label="4 · GameChanger receiving">
            {gcActive
              ? <p className="text-xs text-green-500">GameChanger receiving stream</p>
              : <p className="text-xs text-muted-foreground">Auto-detected — no action needed</p>}
          </Step>
        </div>

        {/* ── Signal health — always visible ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Wifi className="h-3 w-3" /> Source
            </div>
            <div className="flex items-center gap-2">
              <Dot on={!!source} pulse />
              <span className="text-sm font-medium">{source ? "Mevo" : "No input"}</span>
            </div>
            {stream && stream.bwIn > 0 && (
              <p className="text-sm font-semibold tabular-nums">{bps(stream.bwIn)}</p>
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
