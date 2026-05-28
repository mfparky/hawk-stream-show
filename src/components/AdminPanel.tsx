import { useState, useEffect, useRef } from "react";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ChevronDown, Check, AlertCircle, Loader2, MapPin, Minus, Plus,
  Youtube, Trophy, Wrench, Radio, ExternalLink, Bell, Copy, ClipboardList,
} from "lucide-react";
import { useRtmpStats } from "@/hooks/useRtmpStats";
import { useToast } from "@/hooks/use-toast";

export interface AdminSettings {
  streamUrl:        string;
  channelId:        string;
  youtubeApiKey:    string;
  youtubePlaylistId:string;
  venueName:        string;
  venueAddress:     string;
  venueLat:         string;
  venueLon:         string;
  scoreEnabled:     string;
  scoreHomeTeam:    string;
  scoreAwayTeam:    string;
  scoreHomeScore:   string;
  scoreAwayScore:   string;
  scoreStatus:      string;
  rtmpIngestUrl:    string;
  rtmpStreamKey:    string;
  youtubeStudioUrl: string;
  destYoutubeUrl:   string;
  destYoutubeKey:   string;
  destGcUrl:        string;
  destGcKey:        string;
  ntfyTopic:        string;
}

interface AdminPanelProps {
  settings: AdminSettings;
  onSave:   (partial: Partial<AdminSettings>) => Promise<void>;
}

interface GeoResult { lat: string; lon: string; display_name: string }

async function searchAddress(query: string): Promise<GeoResult[]> {
  try {
    const params = new URLSearchParams({
      format: "json", limit: "5", q: query,
      countrycodes: "ca", addressdetails: "1",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "User-Agent": "LovableApp/1.0" } },
    );
    return await res.json();
  } catch {
    return [];
  }
}

// ── Status pill: one of three colors based on connection state ────────────
function StatusDot({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span
        className={`h-3 w-3 rounded-full shrink-0 ${
          on ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-muted-foreground/30"
        }`}
        aria-hidden
      />
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate max-w-full">
        {label}
      </span>
    </div>
  );
}

function StatusBar() {
  const { stats, statsUrl } = useRtmpStats();
  const src   = !!stats?.srcConnected;
  const yt    = (stats?.pushCount ?? 0) >= 1;
  const gc    = (stats?.pushCount ?? 0) >= 2;
  const live  = src && yt && gc;

  if (!statsUrl) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-3 text-center text-xs text-muted-foreground">
        Live status not available — set the relay URL once on{" "}
        <a href="/relay" className="underline">/relay</a>.
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 ${live ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Live status
        </span>
        <span className={`text-[11px] font-bold tabular-nums ${live ? "text-green-500" : "text-muted-foreground"}`}>
          {live ? "● LIVE" : "○ OFFLINE"}
        </span>
      </div>
      <div className="flex items-stretch gap-1.5">
        <StatusDot on={src} label="Mevo" />
        <div className="flex items-center text-muted-foreground text-xs">→</div>
        <StatusDot on={src} label="Relay" />
        <div className="flex items-center text-muted-foreground text-xs">→</div>
        <StatusDot on={yt} label="YouTube" />
        <StatusDot on={gc} label="GC" />
      </div>
    </div>
  );
}

// ── Reusable labeled input ────────────────────────────────────────────────
function Field({
  label, hint, value, onChange, placeholder, mono,
}: {
  label: string; hint?: string;
  value: string; onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
        {label}
        {hint && <span className="ml-1.5 font-normal text-xs">{hint}</span>}
      </label>
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={mono ? "font-mono text-sm" : ""}
      />
    </div>
  );
}

const AdminPanel = ({ settings, onSave }: AdminPanelProps) => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<AdminSettings>(settings);

  // Sync when initial load lands from Supabase
  useEffect(() => { setDraft(settings); }, [settings]);

  const [addrErr, setAddrErr] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef  = useRef<HTMLDivElement>(null);

  const [savingDest,  setSavingDest]  = useState(false);
  const [savedDest,   setSavedDest]   = useState(false);
  const [savingScore, setSavingScore] = useState(false);
  const [savedScore,  setSavedScore]  = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [savedSetup,  setSavedSetup]  = useState(false);

  const set = (field: keyof AdminSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === "venueAddress") {
        setAddrErr(false);
        setSelectedDisplay(null);
      }
    };

  // ── Address autocomplete ────────────────────────────────────────────────
  useEffect(() => {
    const query = draft.venueAddress.trim();
    if (query.length < 3 || selectedDisplay) {
      setResults([]); setShowResults(false); return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const data = await searchAddress(query);
      setResults(data);
      setShowResults(data.length > 0);
      setSearching(false);
      if (data.length === 0) setAddrErr(true);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [draft.venueAddress, selectedDisplay]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectResult = (r: GeoResult) => {
    setDraft((p) => ({
      ...p,
      venueAddress: r.display_name, venueLat: r.lat, venueLon: r.lon,
    }));
    setSelectedDisplay(r.display_name);
    setShowResults(false);
    setAddrErr(false);
  };

  // ── Partial-save helpers (each saves ONLY its own fields) ───────────────
  const saveDestinations = async () => {
    setSavingDest(true);
    try {
      await onSave({
        destYoutubeUrl: draft.destYoutubeUrl,
        destYoutubeKey: draft.destYoutubeKey,
        destGcUrl:      draft.destGcUrl,
        destGcKey:      draft.destGcKey,
      });
      setSavedDest(true);
      toast({ description: "Destinations saved — relay reloads within ~15 s." });
      setTimeout(() => setSavedDest(false), 2500);
    } finally {
      setSavingDest(false);
    }
  };

  const adjustScore = async (field: "scoreHomeScore" | "scoreAwayScore", delta: number) => {
    const current = parseInt(draft[field] || "0", 10) || 0;
    const next    = Math.max(0, current + delta);
    setDraft((p) => ({ ...p, [field]: String(next) }));
    // Save ONLY this field — never persist any unsaved destination draft alongside.
    await onSave({ [field]: String(next) });
  };

  const toggleScoreEnabled = async (enabled: boolean) => {
    const v = enabled ? "true" : "false";
    setDraft((p) => ({ ...p, scoreEnabled: v }));
    await onSave({ scoreEnabled: v });
  };

  const saveScoreboard = async () => {
    setSavingScore(true);
    try {
      await onSave({
        scoreEnabled:   draft.scoreEnabled,
        scoreHomeTeam:  draft.scoreHomeTeam,
        scoreAwayTeam:  draft.scoreAwayTeam,
        scoreHomeScore: draft.scoreHomeScore,
        scoreAwayScore: draft.scoreAwayScore,
        scoreStatus:    draft.scoreStatus,
      });
      setSavedScore(true);
      toast({ description: "Scoreboard saved." });
      setTimeout(() => setSavedScore(false), 2000);
    } finally {
      setSavingScore(false);
    }
  };

  const saveSetup = async () => {
    setSavingSetup(true);
    try {
      await onSave({
        streamUrl:        draft.streamUrl,
        channelId:        draft.channelId,
        youtubeApiKey:    draft.youtubeApiKey,
        youtubePlaylistId:draft.youtubePlaylistId,
        venueName:        draft.venueName,
        venueAddress:     draft.venueAddress,
        venueLat:         draft.venueLat,
        venueLon:         draft.venueLon,
        rtmpIngestUrl:    draft.rtmpIngestUrl,
        rtmpStreamKey:    draft.rtmpStreamKey,
        youtubeStudioUrl: draft.youtubeStudioUrl,
        ntfyTopic:        draft.ntfyTopic,
      });
      setSavedSetup(true);
      toast({ description: "Setup saved." });
      setTimeout(() => setSavedSetup(false), 2000);
    } finally {
      setSavingSetup(false);
    }
  };

  const [testingAlert, setTestingAlert] = useState(false);
  const testAlert = async () => {
    if (!draft.ntfyTopic.trim()) {
      toast({
        description: "Set a topic name first, then save.",
        variant: "destructive",
      });
      return;
    }
    setTestingAlert(true);
    try {
      const res = await fetch(`https://ntfy.sh/${draft.ntfyTopic.trim()}`, {
        method: "POST",
        body: "Test alert from /admin — if you're seeing this on your phone, alerts are set up correctly.",
        headers: { "Title": "Hawks stream — test", "Priority": "default", "Tags": "test_tube" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast({ description: "Test sent. Check your phone — should arrive within a few seconds." });
    } catch (e) {
      toast({
        description: e instanceof Error ? `Failed: ${e.message}` : "Failed",
        variant: "destructive",
      });
    } finally {
      setTestingAlert(false);
    }
  };

  const ytStudio = draft.youtubeStudioUrl || "https://studio.youtube.com";

  return (
    <div className="space-y-4">
      {/* ── Live status bar ── */}
      <StatusBar />

      {/* ──────── PRE-GAME CHECKLIST (accordion) ──────── */}
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-5 py-3 text-foreground transition-colors hover:bg-primary/10">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-primary" />
            Before you go live — pre-game checklist
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-border bg-card p-4 sm:p-5 space-y-4 text-sm">
            <p className="text-xs text-muted-foreground">
              Run top-to-bottom before each game. ~5 minutes if everything goes right.
            </p>

            {[
              {
                title: "Power up the Mevo + confirm internet",
                body: (
                  <>
                    Turn on the camera, wait for its status LED to go solid (connected) — not blinking
                    (still searching for a network). Use the venue Wi-Fi if available, otherwise tether
                    to the operator's phone hotspot.
                  </>
                ),
              },
              {
                title: "Grab today's GameChanger key (RTMP, not RTMPS)",
                body: (
                  <>
                    In the GameChanger app on the manager's device → today's game → <strong>Stream</strong>{" "}
                    → <strong>Use external software</strong>. <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Tap "Switch to insecure ingest (RTMP)" at the bottom of that screen.</span>{" "}
                    The relay can't push to <code className="font-mono">rtmps://</code> — only plain RTMP.
                    Copy both <strong>Stream URL</strong> and <strong>Stream key</strong>.
                  </>
                ),
              },
              {
                title: "Paste into Stream Destinations below",
                body: (
                  <>
                    Scroll to the <strong>Stream destinations</strong> card below and paste into the
                    GameChanger <strong>Stream URL</strong> + <strong>Stream Key</strong> fields. If the
                    YouTube key rotated, paste the new one too. Tap <strong>Save destinations</strong>.
                    Watch the status bar above — the GC dot turns green within ~15 s.
                  </>
                ),
              },
              {
                title: "Start the YouTube broadcast",
                body: (
                  <>
                    In YouTube Studio → Live, create or open the broadcast. Two things <em>before</em>{" "}
                    clicking GO LIVE: (1) <strong>Visibility = Public</strong> (not Unlisted/Private —
                    the home page can't see Unlisted). (2) Click the blue <strong>GO LIVE</strong> button.
                  </>
                ),
              },
              {
                title: "Connect Mevo to the relay",
                body: (
                  <>
                    In the Mevo app, tap the camera to connect → broadcast → <strong>Custom RTMP</strong>{" "}
                    → <strong>Hawk relay</strong> (or paste values from{" "}
                    <a href="/setup" className="underline">streamthehawks.ca/setup</a>). Tap the red{" "}
                    <strong>Go Live</strong> button.
                  </>
                ),
              },
              {
                title: "Verify all four dots are green",
                body: (
                  <>
                    Scroll back up to the status bar. Mevo, Relay, YouTube, GC should all be green.
                    Open <a href="/" className="underline">streamthehawks.ca</a> on a phone — the live
                    embed appears within ~30 s. Tap <strong>Check Live Stream</strong> on the home page
                    to force an immediate re-check if needed.
                  </>
                ),
              },
              {
                title: "During the game — scoreboard",
                body: (
                  <>
                    Use the <strong>Live scoreboard</strong> card below to enable the on-stream
                    scoreboard and update home/away scores. The +/- buttons save instantly.
                  </>
                ),
              },
              {
                title: "After the game",
                body: (
                  <>
                    Tap <strong>End broadcast</strong> in Mevo, then end the broadcast in YouTube Studio
                    (saves a VOD), then end the stream in the GC app. Disable the scoreboard if you want
                    the home page to go quiet between games.
                  </>
                ),
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold tabular-nums">
                  {i + 1}
                </div>
                <div className="flex-1 pt-0.5 min-w-0">
                  <p className="font-semibold leading-snug">{step.title}</p>
                  <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{step.body}</div>
                </div>
              </div>
            ))}

            <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-3">
              Forgot a step? Common-failure shortcuts are in the{" "}
              <a href="/setup" className="underline">streamthehawks.ca/setup</a> troubleshooting accordion.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ──────── 1. PUSH DESTINATIONS (game-day primary) ──────── */}
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Stream destinations
          </h2>
          <a
            href={ytStudio}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            YouTube Studio <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Paste fresh keys before each broadcast. Saves go live on the relay within ~15 s.
        </p>

        {/* YouTube */}
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Youtube className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold">YouTube</span>
          </div>
          <Field
            label="Stream URL"
            value={draft.destYoutubeUrl}
            onChange={set("destYoutubeUrl")}
            placeholder="rtmp://a.rtmp.youtube.com/live2"
            mono
          />
          <Field
            label="Stream Key"
            hint="(rotates per broadcast — copy from Studio → Go Live)"
            value={draft.destYoutubeKey}
            onChange={set("destYoutubeKey")}
            placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
            mono
          />
        </div>

        {/* GameChanger */}
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold">GameChanger</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-semibold">
              Per game
            </span>
          </div>
          <Field
            label="Stream URL"
            value={draft.destGcUrl}
            onChange={set("destGcUrl")}
            placeholder="rtmp://stream.gc.com/live"
            mono
          />
          <Field
            label="Stream Key"
            hint="(per-game — GC app → today's game → Stream → Use external software)"
            value={draft.destGcKey}
            onChange={set("destGcKey")}
            placeholder="game-specific key"
            mono
          />
        </div>

        <Button
          onClick={saveDestinations}
          disabled={savingDest}
          className="w-full h-11 gap-1.5 text-base font-semibold"
        >
          {savingDest ? <Loader2 className="h-4 w-4 animate-spin" /> :
           savedDest  ? <Check className="h-4 w-4" /> : null}
          {savedDest ? "Saved — relay reloading…" : "Save destinations"}
        </Button>
      </section>

      {/* ──────── 2. LIVE SCOREBOARD ──────── */}
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5 space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Live scoreboard
        </h2>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.scoreEnabled === "true"}
            onChange={(e) => toggleScoreEnabled(e.target.checked)}
            className="h-4 w-4 rounded accent-primary border-border"
          />
          <span className="text-sm font-medium">
            Show scoreboard above the live stream
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Home team" value={draft.scoreHomeTeam} onChange={set("scoreHomeTeam")} placeholder="Hawks" />
          <Field label="Away team" value={draft.scoreAwayTeam} onChange={set("scoreAwayTeam")} placeholder="Opponent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Home score</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => adjustScore("scoreHomeScore", -1)}
                className="h-12 w-12 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent active:scale-95 transition">
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-2xl font-bold tabular-nums">
                {draft.scoreHomeScore || "0"}
              </span>
              <button type="button" onClick={() => adjustScore("scoreHomeScore", 1)}
                className="h-12 w-12 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent active:scale-95 transition">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Away score</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => adjustScore("scoreAwayScore", -1)}
                className="h-12 w-12 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent active:scale-95 transition">
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex-1 text-center text-2xl font-bold tabular-nums">
                {draft.scoreAwayScore || "0"}
              </span>
              <button type="button" onClick={() => adjustScore("scoreAwayScore", 1)}
                className="h-12 w-12 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent active:scale-95 transition">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <Field
          label="Period / Status"
          value={draft.scoreStatus}
          onChange={set("scoreStatus")}
          placeholder="e.g. Top 1st, Bottom 3rd, Final"
        />

        <Button
          onClick={saveScoreboard}
          disabled={savingScore}
          variant="outline"
          className="w-full gap-1.5"
        >
          {savingScore ? <Loader2 className="h-4 w-4 animate-spin" /> :
           savedScore  ? <Check className="h-4 w-4" /> : null}
          {savedScore ? "Saved" : "Save scoreboard (teams + period)"}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center -mt-2">
          Score +/- buttons save instantly.
        </p>
      </section>

      {/* ──────── 3. ONE-TIME SETUP (collapsed) ──────── */}
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-5 py-3 text-muted-foreground transition-colors hover:text-foreground">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Wrench className="h-4 w-4" />
            One-time setup
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Mevo · venue · auto-detect
            </span>
          </span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-2 rounded-lg border border-border bg-card p-4 sm:p-5 space-y-5">

            {/* ── Outage alerts (ntfy) ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  Outage alerts (ntfy)
                </p>
                {draft.ntfyTopic.trim() && (
                  <span className="text-[10px] uppercase tracking-wider rounded-full bg-green-500/15 text-green-600 dark:text-green-400 px-2 py-0.5 font-semibold">
                    On
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Get a phone push when YouTube or GameChanger drops mid-game. Each new admin
                needs to install the <strong>ntfy</strong> app and subscribe to the topic below.
              </p>

              {/* Topic display */}
              <Field
                label="Topic name"
                hint="(share with new admins so they can subscribe)"
                value={draft.ntfyTopic}
                onChange={set("ntfyTopic")}
                placeholder="hawks_stream_outage_xxxx"
                mono
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!draft.ntfyTopic.trim()) return;
                    try {
                      await navigator.clipboard.writeText(draft.ntfyTopic.trim());
                      toast({ description: "Topic copied — paste into the ntfy app." });
                    } catch {
                      toast({ description: "Couldn't copy — long-press the value to select.", variant: "destructive" });
                    }
                  }}
                  disabled={!draft.ntfyTopic.trim()}
                  className="gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy topic
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={testAlert}
                  disabled={testingAlert || !draft.ntfyTopic.trim()}
                  className="gap-1.5"
                >
                  {testingAlert ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                  Send test push
                </Button>
              </div>

              {/* Steps for new admins */}
              <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs space-y-2">
                <p className="font-semibold text-foreground">New admin setup</p>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>
                    Install <strong>ntfy</strong> on your phone:{" "}
                    <a
                      href="https://apps.apple.com/us/app/ntfy/id1625396347"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      App Store
                    </a>{" "}
                    /{" "}
                    <a
                      href="https://play.google.com/store/apps/details?id=io.heckel.ntfy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Play Store
                    </a>
                    .
                  </li>
                  <li>
                    In the app, tap <strong>+</strong> → <strong>Subscribe to topic</strong>.
                  </li>
                  <li>
                    Paste the topic name above and tap <strong>Subscribe</strong>.
                  </li>
                  <li>
                    Back here, tap <strong>Send test push</strong> — confirm it lands within
                    a few seconds.
                  </li>
                </ol>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Note: the droplet reads <code className="font-mono">NTFY_TOPIC</code> from{" "}
                <code className="font-mono">rtmp-relay/.env</code>; the value here is just
                shared with admins so they know what to subscribe to. To change which topic
                the droplet pushes to, update <code className="font-mono">.env</code> and
                restart <code className="font-mono">stats-pusher</code>.
              </p>
            </section>

            {/* Mevo credentials */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Mevo (camera operator)
              </p>
              <Field
                label="Mevo RTMP Server URL"
                value={draft.rtmpIngestUrl}
                onChange={set("rtmpIngestUrl")}
                placeholder="rtmp://138.197.140.107/live"
                mono
              />
              <Field
                label="Mevo Stream Key"
                value={draft.rtmpStreamKey}
                onChange={set("rtmpStreamKey")}
                placeholder="mevo"
                mono
              />
              <Field
                label="YouTube Studio URL"
                hint="(one-tap link in monitor)"
                value={draft.youtubeStudioUrl}
                onChange={set("youtubeStudioUrl")}
                placeholder="https://studio.youtube.com/..."
              />
            </section>

            {/* YouTube auto-detect */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                YouTube auto-detect
              </p>
              <Field
                label="YouTube Live Stream URL"
                hint="(manual override)"
                value={draft.streamUrl}
                onChange={set("streamUrl")}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <Field
                label="YouTube Channel ID"
                hint="(for auto-detection)"
                value={draft.channelId}
                onChange={set("channelId")}
                placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <Field
                label="YouTube Data API Key"
                hint="(required for auto-detection)"
                value={draft.youtubeApiKey}
                onChange={set("youtubeApiKey")}
                placeholder="AIza..."
              />
              <p className="text-xs text-muted-foreground">
                When Channel ID + API Key are set, the live stream is detected every 60 s. A manual URL above takes priority.
              </p>
              <Field
                label="Past Games Playlist ID"
                hint="(shown when no stream is live)"
                value={draft.youtubePlaylistId}
                onChange={set("youtubePlaylistId")}
                placeholder="PLxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </section>

            {/* Venue */}
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Venue
              </p>
              <Field
                label="Venue name"
                value={draft.venueName}
                onChange={set("venueName")}
                placeholder="Newmarket Baseball Stadium"
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Address</label>
                <div className="relative" ref={wrapperRef}>
                  <div className="relative flex-1">
                    <Input
                      value={draft.venueAddress}
                      onChange={set("venueAddress")}
                      placeholder="Start typing an address…"
                      className={addrErr ? "border-destructive" : ""}
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {showResults && results.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                      {results.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                          onClick={() => selectResult(r)}
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="text-foreground leading-snug">{r.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedDisplay && (
                  <p className="mt-1.5 text-xs text-primary flex items-center gap-1">
                    <Check className="h-3 w-3" /> Selected
                  </p>
                )}
                {draft.venueLat && draft.venueLon && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Coordinates: {draft.venueLat}, {draft.venueLon}
                  </p>
                )}
                {addrErr && !showResults && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    No results found. Try a different search.
                  </div>
                )}
              </div>
            </section>

            <Button
              onClick={saveSetup}
              disabled={savingSetup}
              className="w-full gap-1.5"
            >
              {savingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> :
               savedSetup  ? <Check className="h-4 w-4" /> : null}
              {savedSetup ? "Saved" : "Save setup"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default AdminPanel;
