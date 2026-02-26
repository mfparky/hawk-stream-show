import { useState, useEffect, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings, Check, AlertCircle, Loader2, MapPin } from "lucide-react";

export interface AdminSettings {
  streamUrl:    string;
  channelId:    string;
  venueName:    string;
  venueAddress: string;
  venueLat:     string;
  venueLon:     string;
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
        <div className="mt-2 rounded-lg border border-border bg-card p-5 space-y-5">

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
              <span className="ml-1.5 font-normal text-xs">
                (for auto-detection — requires VITE_YOUTUBE_API_KEY env var)
              </span>
            </label>
            <Input
              value={draft.channelId}
              onChange={set("channelId")}
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              When a Channel ID is set and the API key is present, the stream URL is detected
              automatically every 60 s. A manual URL above takes priority.
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

          <Button onClick={handleSave} className="gap-1.5">
            {saved && <Check className="h-4 w-4" />}
            {saved ? "Saved" : "Save all settings"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdminPanel;
