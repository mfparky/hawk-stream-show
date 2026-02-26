import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings, Check, MapPin, AlertCircle, Loader2 } from "lucide-react";

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
  status: "idle" | "loading" | "ok" | "error";
  displayName?: string;
  lat?: number;
  lon?: number;
  errorMsg?: string;
}

async function geocodeAddress(
  address: string
): Promise<{ lat: number; lon: number; displayName: string } | null> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const results = await res.json();
  if (!results.length) return null;
  const { lat, lon, display_name } = results[0];
  return { lat: parseFloat(lat), lon: parseFloat(lon), displayName: display_name };
}

const AdminPanel = ({ settings, onSave }: AdminPanelProps) => {
  const [draft, setDraft]       = useState<AdminSettings>(settings);
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [geo, setGeo]           = useState<GeoResult>({ status: "idle" });

  const set = (field: keyof AdminSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear geocode result when address changes
      if (field === "venueAddress") setGeo({ status: "idle" });
    };

  const handleSave = async () => {
    setSaving(true);
    let toSave = { ...draft };

    // Geocode if address is present
    if (draft.venueAddress.trim()) {
      setGeo({ status: "loading" });
      const result = await geocodeAddress(draft.venueAddress.trim());
      if (result) {
        setGeo({
          status:      "ok",
          displayName: result.displayName,
          lat:         result.lat,
          lon:         result.lon,
        });
        toSave = {
          ...toSave,
          venueLat: String(result.lat),
          venueLon: String(result.lon),
        };
      } else {
        setGeo({ status: "error", errorMsg: "Address not found — check spelling and try again." });
        setSaving(false);
        return; // Don't save if geocode failed
      }
    }

    await onSave(toSave);
    setSaved(true);
    setSaving(false);
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
              Venue Address
            </label>
            <Input
              value={draft.venueAddress}
              onChange={set("venueAddress")}
              placeholder="Paste address from Google Maps…"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Copy the address from Google Maps (or any map app) and paste it here.
              The coordinates are looked up automatically on save.
            </p>

            {/* Geocode feedback */}
            {geo.status === "loading" && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Looking up address…
              </div>
            )}
            {geo.status === "ok" && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Resolved:</strong> {geo.displayName}
                  <br />
                  <span className="text-muted-foreground font-mono">
                    {geo.lat?.toFixed(5)}, {geo.lon?.toFixed(5)}
                  </span>
                </span>
              </div>
            )}
            {geo.status === "error" && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {geo.errorMsg}
              </div>
            )}
          </section>

          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : saved
                ? <Check className="h-4 w-4" />
                : null}
            {saving ? "Saving…" : saved ? "Saved" : "Save all settings"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdminPanel;
