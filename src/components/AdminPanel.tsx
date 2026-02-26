import { useState } from "react";
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

/** Geocode an address string via Nominatim → { lat, lon } or null */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { "User-Agent": "LovableApp/1.0" } }
    );
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
  } catch {
    return null;
  }
}

const AdminPanel = ({ settings, onSave }: AdminPanelProps) => {
  const [draft, setDraft]   = useState<AdminSettings>(settings);
  const [saved, setSaved]   = useState(false);
  const [addrErr, setAddrErr] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [resolvedAddr, setResolvedAddr] = useState<string | null>(null);

  const set = (field: keyof AdminSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === "venueAddress") { setAddrErr(false); setResolvedAddr(null); }
    };

  const handleLookup = async () => {
    if (!draft.venueAddress.trim()) return;
    setGeocoding(true);
    setAddrErr(false);
    const result = await geocodeAddress(draft.venueAddress);
    setGeocoding(false);
    if (!result) { setAddrErr(true); return; }
    setDraft((prev) => ({ ...prev, venueLat: String(result.lat), venueLon: String(result.lon) }));
    setResolvedAddr(result.display);
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
            <div className="flex gap-2">
              <Input
                value={draft.venueAddress}
                onChange={set("venueAddress")}
                placeholder="123 Main St, Toronto, ON"
                className={addrErr ? "border-destructive flex-1" : "flex-1"}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleLookup}
                disabled={geocoding || !draft.venueAddress.trim()}
                className="gap-1.5 shrink-0"
              >
                {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Lookup
              </Button>
            </div>
            {resolvedAddr && (
              <p className="mt-1.5 text-xs text-primary">
                ✓ {resolvedAddr}
              </p>
            )}
            {draft.venueLat && draft.venueLon && (
              <p className="mt-1 text-xs text-muted-foreground">
                Coordinates: {draft.venueLat}, {draft.venueLon}
              </p>
            )}
            {addrErr && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Could not find that address. Try a more specific query.
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
