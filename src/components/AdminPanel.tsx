import { useState, useEffect, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings, Check, AlertCircle, Loader2, MapPin, Minus, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface AdminSettings {
  streamUrl:      string;
  channelId:      string;
  youtubeApiKey:  string;
  venueName:      string;
  venueAddress:   string;
  venueLat:       string;
  venueLon:       string;
  scoreEnabled:   string;
  scoreHomeTeam:  string;
  scoreAwayTeam:  string;
  scoreHomeScore: string;
  scoreAwayScore: string;
  scoreStatus:    string;
  gcTeamUrl:      string;
}

interface AdminPanelProps {
  settings: AdminSettings;
  onSave: (settings: AdminSettings) => Promise<void>;
}

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function searchAddress(query: string): Promise<GeoResult[]> {
  try {
    const params = new URLSearchParams({
      format: "json",
      limit: "5",
      q: query,
      countrycodes: "ca",
      addressdetails: "1",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { "User-Agent": "LovableApp/1.0" } }
    );
    return await res.json();
  } catch {
    return [];
  }
}

const AdminPanel = ({ settings, onSave }: AdminPanelProps) => {
  const [draft, setDraft]   = useState<AdminSettings>(settings);
  const [saved, setSaved]   = useState(false);

  // Sync draft when settings load from Supabase (the initial state is empty
  // while the async fetch is in flight, so draft needs to catch up once data arrives).
  useEffect(() => {
    setDraft(settings);
  }, [settings]);
  const [addrErr, setAddrErr] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedDisplay, setSelectedDisplay] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const set = (field: keyof AdminSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === "venueAddress") {
        setAddrErr(false);
        setSelectedDisplay(null);
      }
    };

  // Debounced address search
  useEffect(() => {
    const query = draft.venueAddress.trim();
    if (query.length < 3 || selectedDisplay) {
      setResults([]);
      setShowResults(false);
      return;
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

  // Close dropdown on outside click
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
    setDraft((prev) => ({
      ...prev,
      venueAddress: r.display_name,
      venueLat: r.lat,
      venueLon: r.lon,
    }));
    setSelectedDisplay(r.display_name);
    setShowResults(false);
    setAddrErr(false);
  };

  const handleSave = async () => {
    await onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const adjustScore = async (field: "scoreHomeScore" | "scoreAwayScore", delta: number) => {
    const current = parseInt(draft[field] || "0", 10) || 0;
    const next = Math.max(0, current + delta);
    const nextDraft = { ...draft, [field]: String(next) };
    setDraft(nextDraft);
    await onSave(nextDraft);
  };

  const toggleScoreEnabled = async (enabled: boolean) => {
    const nextDraft = { ...draft, scoreEnabled: enabled ? "true" : "false" };
    setDraft(nextDraft);
    await onSave(nextDraft);
  };

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-5 py-3 text-muted-foreground transition-colors hover:text-foreground">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Settings className="h-4 w-4" />
          Admin
        </span>
        <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg border border-border bg-card p-3 sm:p-5 space-y-3 sm:space-y-5">

          {/* ── Stream ── */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Stream
            </p>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              YouTube Live Stream URL
              <span className="ml-1.5 font-normal text-xs">(manual override)</span>
            </label>
            <Input
              value={draft.streamUrl}
              onChange={set("streamUrl")}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <label className="mt-3 mb-1.5 block text-sm font-medium text-muted-foreground">
              YouTube Channel ID
              <span className="ml-1.5 font-normal text-xs">(for auto-detection)</span>
            </label>
            <Input
              value={draft.channelId}
              onChange={set("channelId")}
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <label className="mt-3 mb-1.5 block text-sm font-medium text-muted-foreground">
              YouTube Data API Key
              <span className="ml-1.5 font-normal text-xs">(required for auto-detection)</span>
            </label>
            <Input
              value={draft.youtubeApiKey}
              onChange={set("youtubeApiKey")}
              placeholder="AIza..."
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              When Channel ID and API Key are set, the live stream is detected automatically
              every 60 s. A manual URL above takes priority.
            </p>
          </section>

          {/* ── Venue ── */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Venue
            </p>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Venue Name
            </label>
            <Input
              value={draft.venueName}
              onChange={set("venueName")}
              placeholder="Newmarket Baseball Stadium"
            />
            <label className="mt-3 mb-1.5 block text-sm font-medium text-muted-foreground">
              Address
            </label>
            <div className="relative" ref={wrapperRef}>
              <div className="flex gap-2">
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
              </div>

              {/* Results dropdown */}
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
          </section>

          {/* ── Live Score ── */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Live Score
            </p>

            <label className="flex items-center gap-2 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={draft.scoreEnabled === "true"}
                onChange={(e) => toggleScoreEnabled(e.target.checked)}
                className="h-4 w-4 rounded accent-primary border-border"
              />
              <span className="text-sm font-medium text-muted-foreground">
                Show scoreboard above stream
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Home Team
                </label>
                <Input
                  value={draft.scoreHomeTeam}
                  onChange={set("scoreHomeTeam")}
                  placeholder="Hawks"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Away Team
                </label>
                <Input
                  value={draft.scoreAwayTeam}
                  onChange={set("scoreAwayTeam")}
                  placeholder="Opponent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Home Score
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustScore("scoreHomeScore", -1)}
                    className="h-11 w-11 sm:h-9 sm:w-9 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 text-center text-lg font-bold tabular-nums">
                    {draft.scoreHomeScore || "0"}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustScore("scoreHomeScore", 1)}
                    className="h-11 w-11 sm:h-9 sm:w-9 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Away Score
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustScore("scoreAwayScore", -1)}
                    className="h-11 w-11 sm:h-9 sm:w-9 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="flex-1 text-center text-lg font-bold tabular-nums">
                    {draft.scoreAwayScore || "0"}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustScore("scoreAwayScore", 1)}
                    className="h-11 w-11 sm:h-9 sm:w-9 shrink-0 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
              Period / Status
            </label>
            <Input
              value={draft.scoreStatus}
              onChange={set("scoreStatus")}
              placeholder="e.g. Q3, Halftime, Final, 5th Inning"
            />
          </section>

          {/* ── GameChanger Roster ── */}
          <RosterSection gcTeamUrl={draft.gcTeamUrl} onChange={(v) => setDraft((p) => ({ ...p, gcTeamUrl: v }))} />

          <Button onClick={handleSave} className="gap-1.5">
            {saved && <Check className="h-4 w-4" />}
            {saved ? "Saved" : "Save all settings"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/** Sub-section for GC roster scraping */
function RosterSection({ gcTeamUrl, onChange }: { gcTeamUrl: string; onChange: (v: string) => void }) {
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const scrapeNow = async () => {
    setScraping(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-roster");
      if (error) throw error;
      if (data?.success) {
        setResult(`✅ Imported ${data.count} players`);
      } else {
        setResult(`⚠️ ${data?.error ?? "Unknown error"}`);
      }
    } catch (e: any) {
      setResult(`❌ ${e.message}`);
    } finally {
      setScraping(false);
    }
  };

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Team Roster (GameChanger)
      </p>
      <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
        GameChanger Team Page URL
      </label>
      <Input
        value={gcTeamUrl}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://web.gc.com/teams/..."
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Paste your team's public GameChanger page URL. Save settings first, then click Sync.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 gap-1.5"
        onClick={scrapeNow}
        disabled={scraping || !gcTeamUrl}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${scraping ? "animate-spin" : ""}`} />
        {scraping ? "Syncing…" : "Sync Roster Now"}
      </Button>
      {result && (
        <p className="mt-2 text-xs text-muted-foreground">{result}</p>
      )}
    </section>
  );
}

export default AdminPanel;
