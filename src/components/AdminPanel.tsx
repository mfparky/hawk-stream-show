import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Settings, Check } from "lucide-react";

interface AdminPanelProps {
  streamUrl: string;
  onUrlChange: (url: string) => Promise<void>;
}

const AdminPanel = ({ streamUrl, onUrlChange }: AdminPanelProps) => {
  const [draft, setDraft] = useState(streamUrl);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onUrlChange(draft);
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
        <div className="mt-2 rounded-lg border border-border bg-card p-5">
          <label className="mb-2 block text-sm font-medium text-muted-foreground">
            YouTube Live Stream URL
          </label>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1"
            />
            <Button onClick={handleSave} className="gap-1.5">
              {saved ? <Check className="h-4 w-4" /> : null}
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default AdminPanel;
