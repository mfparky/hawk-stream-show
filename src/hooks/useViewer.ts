import { useState, useEffect, useCallback } from "react";

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


  const register = useCallback((firstName: string, lastName: string) => {
    setLoading(true);
    const visitorId = viewer?.visitorId ?? generateVisitorId();

    const identity: ViewerIdentity = { visitorId, firstName, lastName };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    setViewer(identity);
    setLoading(false);
  }, [viewer]);

  return { viewer, register, loading, needsPrompt: !viewer };
}
