import { useEffect, useState } from "react";
import { Loader2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { STREAM_AUTO_URL_KEY, STREAM_AUTO_EXPIRES_KEY } from "@/lib/constants";
import { toast } from "@/components/ui/use-toast";

const COOLDOWN_MS = 60_000;
const STREAM_TTL_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours
const LAST_CHECK_KEY = "lastLiveCheckAt";

interface Props {
  channelId: string | null;
}

const CheckLiveStreamButton = ({ channelId }: Props) => {
  const [loading, setLoading] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Tick a 1-second cooldown countdown
  useEffect(() => {
    const tick = () => {
      const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
      const left = Math.max(0, COOLDOWN_MS - (Date.now() - last));
      setCooldownLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const onCheck = async () => {
    if (!channelId || loading || cooldownLeft > 0) return;
    setLoading(true);
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-proxy?action=live&channelId=${encodeURIComponent(channelId)}`;
      const res = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!res.ok) throw new Error(`Proxy ${res.status}`);
      const json = await res.json();
      const videoId: string | null = json?.items?.[0]?.id?.videoId ?? null;
      if (!videoId) {
        toast({ title: "No live stream found", description: "Try again in a minute." });
        return;
      }
      const streamUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const expiresAt = new Date(Date.now() + STREAM_TTL_MS).toISOString();
      const { error } = await supabase
        .from("settings")
        .upsert(
          [
            { key: STREAM_AUTO_URL_KEY, value: streamUrl },
            { key: STREAM_AUTO_EXPIRES_KEY, value: expiresAt },
          ],
          { onConflict: "key" }
        );
      if (error) throw error;
      toast({ title: "Live stream found!", description: "Loading for everyone…" });
    } catch (e) {
      console.error("[CheckLive]", e);
      toast({ title: "Couldn't check right now", description: "Please try again shortly." });
    } finally {
      setLoading(false);
    }
  };

  if (!channelId) return null;

  const seconds = Math.ceil(cooldownLeft / 1000);
  const disabled = loading || cooldownLeft > 0;

  return (
    <div className="flex justify-center">
      <Button onClick={onCheck} disabled={disabled} variant="default" size="lg" className="gap-2">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </>
        ) : cooldownLeft > 0 ? (
          <>
            <Radio className="h-4 w-4" /> Check again in {seconds}s
          </>
        ) : (
          <>
            <Radio className="h-4 w-4" /> Check for live stream
          </>
        )}
      </Button>
    </div>
  );
};

export default CheckLiveStreamButton;
