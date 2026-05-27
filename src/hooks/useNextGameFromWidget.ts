import { useEffect, useState } from "react";

/**
 * Parses the next upcoming game date/time from the rendered GameChanger
 * schedule widget DOM (#gc-schedule-widget-44s1). Used as the primary
 * source for the countdown because GC's public team page now requires
 * sign-in (so server-side scraping returns no data).
 *
 * Strategy: walk the widget's innerText, find every "Mon DD, YYYY H:MM AM/PM"
 * substring, pick the earliest one that's still in the future. Times are
 * treated as America/Toronto.
 */

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function isDST(year: number, month: number, day: number): boolean {
  const marchFirst = new Date(Date.UTC(year, 2, 1)).getUTCDay();
  const dstStart = 1 + ((7 - marchFirst) % 7) + 7;
  const novFirst = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const dstEnd = 1 + ((7 - novFirst) % 7);
  if (month > 2 && month < 10) return true;
  if (month === 2) return day >= dstStart;
  if (month === 10) return day < dstEnd;
  return false;
}

function toTimestamp(monthName: string, day: number, year: number, hour12: number, minute: number, ampm: string): number | null {
  const month = MONTHS[monthName.toLowerCase().slice(0, 3)];
  if (month === undefined) return null;
  let hour = hour12 % 12;
  if (ampm.toUpperCase() === "PM") hour += 12;
  const offsetHours = isDST(year, month, day) ? 4 : 5;
  return Date.UTC(year, month, day, hour + offsetHours, minute);
}

function parseNextFromText(text: string): Date | null {
  const now = Date.now();
  let earliest: number | null = null;

  // Pattern A: "May 19, 2026 6:00 PM"
  const reLong = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})[^0-9]{0,40}?(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  let m: RegExpExecArray | null;
  while ((m = reLong.exec(text)) !== null) {
    const ts = toTimestamp(m[1], parseInt(m[2], 10), parseInt(m[3], 10), parseInt(m[4], 10), parseInt(m[5], 10), m[6]);
    if (ts !== null && ts > now && (earliest === null || ts < earliest)) earliest = ts;
  }

  // Pattern B: "5/19/26 6:00 PM" or "5/19 6:00 PM"
  const reSlash = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?[^0-9]{0,40}?(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
  while ((m = reSlash.exec(text)) !== null) {
    const month0 = parseInt(m[1], 10) - 1;
    const day = parseInt(m[2], 10);
    let year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    if (month0 < 0 || month0 > 11) continue;
    let hour = parseInt(m[4], 10) % 12;
    if (m[6].toUpperCase() === "PM") hour += 12;
    const minute = parseInt(m[5], 10);
    const offsetHours = isDST(year, month0, day) ? 4 : 5;
    const ts = Date.UTC(year, month0, day, hour + offsetHours, minute);
    if (ts > now && (earliest === null || ts < earliest)) earliest = ts;
  }

  return earliest !== null ? new Date(earliest) : null;
}

export function useNextGameFromWidget(): Date | null {
  const [next, setNext] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const scan = () => {
      if (cancelled) return;
      const container = document.getElementById("gc-schedule-widget-44s1");
      const text = container?.innerText ?? container?.textContent ?? "";
      if (text && text.trim().length > 20) {
        const found = parseNextFromText(text);
        if (found) {
          console.log("[NextGameFromWidget] Found:", found.toISOString());
          setNext(found);
          return true;
        }
      }
      return false;
    };

    // Poll quickly while the widget mounts/loads, then back off.
    const fast = setInterval(() => {
      attempts++;
      if (scan() || attempts > 30) clearInterval(fast);
    }, 1000);

    const slow = setInterval(scan, 30_000);

    return () => {
      cancelled = true;
      clearInterval(fast);
      clearInterval(slow);
    };
  }, []);

  return next;
}
