import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings, Check } from "lucide-react";

export interface AdminSettings {
  streamUrl:   string;
  channelId:   string;
  venueName:   string;
  venueLat:    string;
  venueLon:    string;
}

interface AdminPanelProps {
  settings: AdminSettings;
  onSave: (settings: AdminSettings) => Promise<void>;
}

const AdminPanel = ({ settings, onSave }: AdminPanelProps) => {
  const [draft, setDraft] = useState<AdminSettings>(settings);
  const [saved, setSaved] = useState(false);

  const set = (field: keyof AdminSettings) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setDraft((prev) => ({ ...prev, [field]: e.target.value }));

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
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Latitude
                </label>
                <Input
                  value={draft.venueLat}
                  onChange={set("venueLat")}
                  placeholder="44.0594"
                  type="number"
                  step="any"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
                  Longitude
                </label>
                <Input
                  value={draft.venueLon}
                  onChange={set("venueLon")}
                  placeholder="-79.4608"
                  type="number"
                  step="any"
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Used for the weather widget and venue map shown to viewers.
              Right-click any location on Google Maps → "What's here?" to get coordinates.
            </p>
          </section>

          <Button onClick={handleSave} className="gap-1.5">
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Saved" : "Save all settings"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdminPanel;
