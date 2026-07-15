// deno-lint-ignore-file no-explicit-any
// Public edge function: fetches a GameChanger team page and returns the
// next upcoming game (date + time string + opponent). No auth required.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

interface Game {
  date: string;      // "May 19, 2026"
  time: string;      // "6:00 PM"
  opponent: string;  // "Orangeville Bengals 11U"
  isHome: boolean;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * GC pages have rows shaped like:
 *   "Tue May 19  Orangeville Bengals 11U  May 19, 2026  6:00 PM"
 * Past games end with "W 12-10" / "L 5-6" instead of a time.
 * We extract by splitting on the long-date anchor.
 */
function parseSchedule(text: string): Game[] {
  const games: Game[] = [];
  // Match: "<Opponent or @Opponent> <Mon DD, YYYY> <H:MM AM/PM>"
  const re = /([@A-Za-z][A-Za-z0-9 .'\-\/]{1,60}?)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const opponentRaw = m[1].trim();
    // Drop short-date prefix like "Tue May 19" if greedy match grabbed it
    const opponent = opponentRaw.replace(
      /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+/i,
      "",
    );
    const isHome = !opponent.startsWith("@");
    games.push({
      date: m[2],
      time: m[3].toUpperCase().replace(/\s+/g, " "),
      opponent: opponent.replace(/^@\s*/, ""),
      isHome,
    });
  }
  return games;
}

function toTimestamp(date: string, time: string): number | null {
  // "May 19, 2026" + "6:00 PM"
  const dm = date.match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  const tm = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!dm || !tm) return null;
  const month = MONTHS[dm[1].toLowerCase().slice(0, 3)];
  if (month === undefined) return null;
  const day = parseInt(dm[2], 10);
  const year = parseInt(dm[3], 10);
  let hour = parseInt(tm[1], 10) % 12;
  if (tm[3].toUpperCase() === "PM") hour += 12;
  const minute = parseInt(tm[2], 10);
  // Treat times as America/Toronto. Simple DST rule: EDT (UTC-4) from
  // 2nd Sun of March to 1st Sun of November, otherwise EST (UTC-5).
  const offsetHours = isToBaseDST(year, month, day) ? 4 : 5;
  return Date.UTC(year, month, day, hour + offsetHours, minute);
}

function isToBaseDST(year: number, month: number, day: number): boolean {
  // DST start: 2nd Sunday of March
  const marchFirst = new Date(Date.UTC(year, 2, 1)).getUTCDay();
  const dstStart = 1 + ((7 - marchFirst) % 7) + 7; // day-of-month
  // DST end: 1st Sunday of November
  const novFirst = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const dstEnd = 1 + ((7 - novFirst) % 7);
  if (month > 2 && month < 10) return true;
  if (month === 2) return day >= dstStart;
  if (month === 10) return day < dstEnd;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const teamUrl =
      url.searchParams.get("teamUrl") ??
      "https://web.gc.com/teams/Ifp5ZNyiRQsa";

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const fc = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: teamUrl,
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 5000,
        maxAge: 0,
      }),
    });
    if (!fc.ok) throw new Error(`Firecrawl ${fc.status}`);
    const fcJson = await fc.json();
    const markdown: string =
      fcJson?.data?.markdown ?? fcJson?.markdown ?? "";
    const text = stripTags(markdown);
    const games = parseSchedule(text);
    const now = Date.now();
    let next: (Game & { startsAt: string; startsAtMs: number }) | null = null;
    for (const g of games) {
      const ts = toTimestamp(g.date, g.time);
      if (ts === null || ts <= now) continue;
      if (!next || ts < next.startsAtMs) {
        next = { ...g, startsAtMs: ts, startsAt: new Date(ts).toISOString() };
      }
    }

    return new Response(
      JSON.stringify({
        next,
        upcomingCount: games.filter((g) => {
          const t = toTimestamp(g.date, g.time);
          return t !== null && t > now;
        }).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
