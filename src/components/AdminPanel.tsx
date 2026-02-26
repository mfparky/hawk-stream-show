import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings, Check, AlertCircle } from "lucide-react";

export interface AdminSettings {
  streamUrl:    string;
  channelId:    string;
  venueName:    string;
  venueAddress: string; // stores the raw "lat, lon" string the user pastes
  venueLat:     string;
  venueLon:     string;
}

interface AdminPanelProps {
  settings: AdminSettings;
  onSave: (settings: AdminSettings) => Promise<void>;
}

/** Parse "lat, lon" or "lat lon" → { lat, lon } or null if invalid. */
function parseCoords(raw: string): { lat: number; lon: number } | null {
  const parts = raw.trim().split(/[\s,]+/);
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lon = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

const AdminPanel = ({ settings, onSave }: AdminPanelProps) => {
  const [draft, setDraft]   = useState<AdminSettings>(settings);
  const [saved, setSaved]   = useState(false);
  const [coordErr, setCoordErr] = useState(false);

  const set = (field: keyof AdminSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === "venueAddress") setCoordErr(false);
    };

  const handleSave = async () => {
    let toSave = { ...draft };

    if (draft.venueAddress.trim()) {
      const parsed = parseCoords(draft.venueAddress);
      if (!parsed) { setCoordErr(true); return; }
      toSave = { ...toSave, venueLat: String(parsed.lat), venueLon: String(parsed.lon) };
    }

    await onSave(toSave);
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
              Coordinates
            </label>
            <Input
              value={draft.venueAddress}
              onChange={set("venueAddress")}
              placeholder="44.0529, -79.4611"
              className={coordErr ? "border-destructive" : ""}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Paste latitude and longitude from Google Maps (right-click a location → copy coordinates).
            </p>
            {coordErr && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Enter valid coordinates, e.g. 44.0529, -79.4611
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
