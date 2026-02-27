import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "viewer_identity";

interface ViewerIdentity {
  visitorId: string;
  firstName: string;
  lastName: string;
}

function getStoredViewer(): ViewerIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.visitorId && parsed.firstName && parsed.lastName) return parsed;
    return null;
  } catch {
    return null;
  }
}

function generateVisitorId(): string {
  return crypto.randomUUID();
}

export function useViewer() {
  const [viewer, setViewer] = useState<ViewerIdentity | null>(getStoredViewer);
  const [loading, setLoading] = useState(false);

  // On mount, verify the stored viewer still exists in DB (optional sync)
  useEffect(() => {
    if (!viewer) return;
    // No-op — trust localStorage; Supabase is the persistent backup
  }, [viewer]);

  const register = useCallback(async (firstName: string, lastName: string) => {
    setLoading(true);
    const visitorId = viewer?.visitorId ?? generateVisitorId();

    const identity: ViewerIdentity = { visitorId, firstName, lastName };

    // Upsert into Supabase
    await supabase.from("viewers").upsert(
      { visitor_id: visitorId, first_name: firstName, last_name: lastName },
      { onConflict: "visitor_id" }
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    setViewer(identity);
    setLoading(false);
  }, [viewer]);

  return { viewer, register, loading, needsPrompt: !viewer };
}
