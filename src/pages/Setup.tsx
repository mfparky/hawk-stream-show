import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Copy, Check, Radio, ExternalLink, Smartphone,
  Server, Youtube, Trophy, Wifi, AlertCircle, ChevronDown,
} from "lucide-react";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useOperatorSettings } from "@/hooks/useOperatorSettings";
import { useRtmpStats } from "@/hooks/useRtmpStats";

const DEFAULT_RTMP_URL    = "rtmp://138.197.140.107:1935/live";
const DEFAULT_STREAM_KEY  = "mevo";
const DEFAULT_YT_STUDIO   = "https://studio.youtube.com";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ description: `${label} copied to clipboard` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        description: "Couldn't copy — long-press the value to select instead",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </p>
      <div className="flex items-stretch gap-2">
        <code
          className="flex-1 min-w-0 break-all rounded-md bg-muted px-3 py-2.5 font-mono text-sm sm:text-base leading-snug"
          onClick={copy}
        >
          {value}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={copy}
          className="shrink-0 h-auto px-3"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          <span className="ml-1.5 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
    </Card>
  );
}

function FlowNode({
  icon: Icon, title, sub, tone = "default",
}: {
  icon: typeof Smartphone; title: string; sub: string;
  tone?: "default" | "ok" | "off";
}) {
  const ring =
    tone === "ok"  ? "border-green-500/50 bg-green-500/5" :
    tone === "off" ? "border-border bg-muted/30"          :
                     "border-border bg-card";
  const iconColor =
    tone === "ok"  ? "text-green-500" :
    tone === "off" ? "text-muted-foreground" :
                     "text-foreground";
  return (
    <div className={`flex-1 rounded-xl border p-3 sm:p-4 text-center ${ring}`}>
      <Icon className={`mx-auto h-6 w-6 sm:h-7 sm:w-7 ${iconColor}`} />
      <p className="mt-1.5 text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center text-muted-foreground text-xs font-medium px-1">
      <span className="hidden sm:inline">→</span>
      <span className="sm:hidden">↓</span>
    </div>
  );
}

function EncodingCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold tabular-nums">
        {n}
      </div>
      <div className="flex-1 pt-0.5 min-w-0">
        <p className="font-semibold leading-snug">{title}</p>
        <div className="text-sm text-muted-foreground mt-1 space-y-1">{children}</div>
      </div>
    </div>
  );
}

const Setup = () => {
  const ops          = useOperatorSettings();
  const { stats }    = useRtmpStats();

  const rtmpUrl   = ops.rtmpIngestUrl    || DEFAULT_RTMP_URL;
  const streamKey = ops.rtmpStreamKey    || DEFAULT_STREAM_KEY;
  const ytStudio  = ops.youtubeStudioUrl || DEFAULT_YT_STUDIO;

  const sourceLive   = !!stats?.srcConnected;
  const youtubeLive  = (stats?.pushCount ?? 0) >= 1;
  const gcLive       = (stats?.pushCount ?? 0) >= 2;

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Stream Setup" />

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* ── Nav ── */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <Link
            to="/relay"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Live monitor <Radio className="h-4 w-4" />
          </Link>
        </div>

        {/* ── Hero ── */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold">Stream from Mevo</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Tap these values into the Mevo app's <strong>Custom RTMP</strong> destination.
            One stream → fans out to YouTube + GameChanger automatically.
          </p>
        </div>

        {/* ── Copy-paste fields ── */}
        <div className="space-y-3">
          <CopyField label="RTMP URL" value={rtmpUrl} />
          <CopyField label="Stream Key" value={streamKey} />
          <p className="text-[11px] text-muted-foreground text-center">
            Leave <strong>Username</strong> and <strong>Password</strong> blank in Mevo.
          </p>
        </div>

        {/* ── Flow diagram ── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 text-center">
            How the stream travels
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-stretch">
            <FlowNode
              icon={Smartphone} title="Mevo"
              sub={sourceLive ? "Connected" : "Camera"}
              tone={sourceLive ? "ok" : "default"}
            />
            <FlowArrow />
            <FlowNode
              icon={Server} title="Relay"
              sub={sourceLive ? "Receiving" : "138.197.140.107"}
              tone={sourceLive ? "ok" : "default"}
            />
            <FlowArrow />
            <div className="flex-1 flex flex-col gap-1.5">
              <FlowNode
                icon={Youtube} title="YouTube"
                sub={youtubeLive ? "Pushing" : "Idle"}
                tone={youtubeLive ? "ok" : "off"}
              />
              <FlowNode
                icon={Trophy} title="GameChanger"
                sub={gcLive ? "Pushing" : "Idle"}
                tone={gcLive ? "ok" : "off"}
              />
            </div>
          </div>
          {sourceLive && (
            <p className="text-xs text-green-600 dark:text-green-500 text-center mt-2 flex items-center justify-center gap-1.5">
              <Wifi className="h-3.5 w-3.5" /> Relay is live right now
            </p>
          )}
        </div>

        {/* ── Encoding settings ── */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Recommended encoding (Mevo → Settings)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <EncodingCard label="Resolution" value="1080p" hint="720p on weak LTE" />
            <EncodingCard label="FPS"        value="30" />
            <EncodingCard label="Bitrate"    value="4–6"   hint="Mbps" />
            <EncodingCard label="Keyframe"   value="2 s" />
            <EncodingCard label="Audio"      value="AAC"   hint="128 kbps" />
          </div>
        </div>

        {/* ── Go-live steps ── */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Go-live checklist
          </p>

          <Step n={1} title="Open the Mevo app and connect to the camera">
            Basic <strong>Mevo</strong> app (not <em>Mevo Multicam</em>). Sign in
            with a <strong>Mevo Plus / Pro</strong> account.
          </Step>

          <Step n={2} title="Pick the Custom RTMP destination">
            Tap broadcast → <strong>Streaming Destination</strong> →
            <strong> Custom RTMP</strong>. If "Hawk relay" already exists, just
            select it. Otherwise paste the URL + key from above.
          </Step>

          <Step n={3} title="Tap Go Live">
            Source dot on the <Link to="/relay" className="underline">live monitor</Link>{" "}
            should turn green within ~5 seconds.
          </Step>

          <Step n={4} title="Start the YouTube broadcast">
            <p>
              Once the relay is receiving, YouTube needs you to confirm the broadcast.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <a href={ytStudio} target="_blank" rel="noopener noreferrer">
                Open YouTube Studio <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>
                Confirm <strong>Visibility = Public</strong> in the broadcast settings.
                Unlisted/Private won't be detected by the home page.
              </li>
              <li>
                Click the blue <strong>GO LIVE</strong> button in the Live Control Room.
              </li>
            </ul>
          </Step>

          <Step n={5} title="Done">
            The home page auto-embeds the YouTube stream within ~30 s. The GameChanger
            broadcast updates automatically — no separate action needed in the Mevo app.
          </Step>
        </div>

        {/* ── Troubleshooting ── */}
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Something not working?
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-xl border border-border bg-card p-4 space-y-3 text-sm">
              <div>
                <p className="font-semibold">Source stays red on /relay</p>
                <p className="text-muted-foreground">
                  Mevo isn't reaching the relay. Check the RTMP URL above, and that
                  the phone has working internet (LTE or Wi-Fi).
                </p>
              </div>
              <div>
                <p className="font-semibold">YouTube dot red, Source green</p>
                <p className="text-muted-foreground">
                  YouTube key expired. Open <Link to="/admin" className="underline">/admin</Link>{" "}
                  → <strong>Push Destinations</strong> → paste a fresh key from
                  YouTube Studio → Save. The relay reloads within ~15 s.
                </p>
              </div>
              <div>
                <p className="font-semibold">GameChanger dot red, Source green</p>
                <p className="text-muted-foreground">
                  Each new GC game has its own key. In the GC app → today's game →
                  Stream → <strong>Use external software</strong> → copy URL + key
                  → paste into <Link to="/admin" className="underline">/admin</Link>{" "}
                  → Push Destinations → Save.
                </p>
              </div>
              <div>
                <p className="font-semibold">YouTube embed never appears on the home page</p>
                <p className="text-muted-foreground">
                  Two most common causes, in order:
                </p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>
                    Broadcast <strong>Visibility = Unlisted/Private</strong>. The home
                    page uses the public YouTube Data API and won't see Unlisted streams.
                    Flip to <strong>Public</strong> in YouTube Studio → Live → Settings.
                  </li>
                  <li>
                    Forgot to click the blue <strong>GO LIVE</strong> button in YouTube
                    Studio. The relay can push bytes all day, but YouTube won't broadcast
                    publicly until you confirm.
                  </li>
                </ul>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </main>
    </div>
  );
};

export default Setup;
