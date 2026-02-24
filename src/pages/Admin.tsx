import { useState, useEffect } from "react";
import AdminPanel from "@/components/AdminPanel";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const STREAM_URL_KEY = "stream_url";

const Admin = () => {
  const [streamUrl, setStreamUrl] = useState("");

  useEffect(() => {
    supabase
      .from("settings")
      .select("value")
      .eq("key", STREAM_URL_KEY)
      .single()
      .then(({ data }) => {
        if (data) setStreamUrl(data.value);
      });
  }, []);

  const handleUrlChange = async (url: string) => {
    setStreamUrl(url);
    await supabase
      .from("settings")
      .upsert({ key: STREAM_URL_KEY, value: url, updated_at: new Date().toISOString() });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <img src="/favicon.ico" alt="Newmarket Hawks" className="h-8 w-8 shrink-0 brightness-0 invert" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-primary leading-none">
              Newmarket Hawks
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
              Admin Panel
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stream
        </Link>

        <AdminPanel streamUrl={streamUrl} onUrlChange={handleUrlChange} />
      </main>
    </div>
  );
};

export default Admin;
