import { useEffect, useState } from "react";

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Best-effort parser: scans the GC widget innerText for the first upcoming
 * game's date + time. GC renders entries like:
 *   "May 19, 2026"
 *   "3:00 PM"
 * Returns the soonest future Date found, or null.
 */
function parseNextGame(text: string): Date | null {
  if (!text) return null;
  // Find all date matches with their indices
  const dateRe = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/gi;
  const timeRe = /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi;
  const now = Date.now();
  let best: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = dateRe.exec(text)) !== null) {
    const month = MONTHS[m[1].toLowerCase().slice(0, 3)];
    const day = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    // Look for the nearest time after this date (within 200 chars)
    const window = text.slice(m.index, m.index + 200);
    timeRe.lastIndex = 0;
    const tm = timeRe.exec(window);
    let hour = 0, min = 0;
    if (tm) {
      hour = parseInt(tm[1], 10) % 12;
      if (tm[3].toUpperCase() === "PM") hour += 12;
      min = parseInt(tm[2], 10);
    }
    const ts = new Date(year, month, day, hour, min).getTime();
    if (ts > now && (best === null || ts < best)) best = ts;
  }
  return best ? new Date(best) : null;
}

export function useNextGameTime(): Date | null {
  const [next, setNext] = useState<Date | null>(null);

  useEffect(() => {
    const scan = () => {
      const el = document.getElementById("gc-schedule-widget-44s1");
      if (!el) return;
      const text = (el.innerText ?? el.textContent ?? "").trim();
      const parsed = parseNextGame(text);
      setNext((prev) => {
        if (!parsed && !prev) return prev;
        if (parsed && prev && parsed.getTime() === prev.getTime()) return prev;
        return parsed;
      });
    };
    scan();
    const id = setInterval(scan, 5000);
    return () => clearInterval(id);
  }, []);

  return next;
}
