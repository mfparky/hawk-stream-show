const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

async function firecrawlScrape(apiKey: string, url: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 5000,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Firecrawl error:", data);
    throw new Error("Firecrawl scrape failed");
  }
  return data?.data?.markdown ?? data?.markdown ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Get the GC team URL from settings
    const { data: setting } = await sb
      .from("settings")
      .select("value")
      .eq("key", "gc_team_url")
      .maybeSingle();

    const teamUrl = setting?.value;
    if (!teamUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "No GameChanger team URL configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Scrape the team homepage to find the "Team" tab link
    console.log("Step 1: Scraping team homepage:", teamUrl);
    const homeMd = await firecrawlScrape(firecrawlKey, teamUrl);
    console.log("Homepage markdown length:", homeMd.length);

    // Find the "Team" tab link — GC uses URLs like /teams/ID/SEASON-SLUG/team
    const teamLinkMatch = homeMd.match(/\[Team\]\((https:\/\/web\.gc\.com\/teams\/[^\s)]+\/team)\)/i);
    let rosterUrl: string;

    if (teamLinkMatch) {
      rosterUrl = teamLinkMatch[1];
      console.log("Found Team tab URL:", rosterUrl);
    } else {
      // Fallback: try appending /team to the URL
      rosterUrl = teamUrl.replace(/\/?$/, "/team");
      console.log("No Team tab found, trying fallback:", rosterUrl);
    }

    // Step 2: Scrape the team/roster page
    console.log("Step 2: Scraping roster page:", rosterUrl);
    const rosterMd = await firecrawlScrape(firecrawlKey, rosterUrl);
    console.log("Roster markdown length:", rosterMd.length);
    console.log("Roster markdown:\n", rosterMd.substring(0, 3000));

    // Parse roster from markdown
    const players: { jersey_number: string; player_name: string; position: string }[] = [];
    const lines = rosterMd.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Pattern 1: markdown table row  | 12 | John Smith | OF |
      const tableMatch = trimmed.match(
        /\|\s*#?(\d{1,3})\s*\|\s*([A-Za-z][A-Za-z\s.'\-]+?)\s*\|\s*([A-Za-z0-9/\s]+?)\s*\|?/
      );
      if (tableMatch) {
        players.push({
          jersey_number: tableMatch[1].trim(),
          player_name: tableMatch[2].trim(),
          position: tableMatch[3].trim(),
        });
        continue;
      }

      // Pattern 2: #12 John Smith  or  #12 John Smith - OF
      const hashMatch = trimmed.match(
        /^#(\d{1,3})\s+([A-Za-z][A-Za-z\s.'\-]+?)(?:\s*[-–|]\s*([A-Za-z0-9/\s]+))?$/
      );
      if (hashMatch) {
        players.push({
          jersey_number: hashMatch[1].trim(),
          player_name: hashMatch[2].trim(),
          position: hashMatch[3]?.trim() ?? "",
        });
        continue;
      }

      // Pattern 3: "12 | John Smith | OF" or "12 John Smith OF"
      const pipeMatch = trimmed.match(
        /^(\d{1,3})\s*\|\s*([A-Za-z][A-Za-z\s.'\-]+?)\s*\|\s*([A-Za-z0-9/\s]+)/
      );
      if (pipeMatch) {
        players.push({
          jersey_number: pipeMatch[1].trim(),
          player_name: pipeMatch[2].trim(),
          position: pipeMatch[3].trim(),
        });
        continue;
      }

      // Pattern 4: Lines like "12\nJohn Smith\nOF" (stacked format)
      // We'll handle this below after checking for number-only lines
    }

    // Pattern 5: Stacked format — jersey number on its own line, followed by name
    // GC sometimes renders roster as: "12\n\nJohn Smith\n\nOF" or similar
    if (players.length === 0) {
      const allLines = lines.map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < allLines.length; i++) {
        const numMatch = allLines[i].match(/^#?(\d{1,3})$/);
        if (numMatch && i + 1 < allLines.length) {
          const name = allLines[i + 1];
          // Name must look like a person's name (at least 2 chars, starts with letter)
          if (/^[A-Za-z][A-Za-z\s.'\-]{1,}$/.test(name) && !name.match(/^(Staff|Coach|Manager|Home|Schedule|Team|Stats|Follow)/i)) {
            const pos = (i + 2 < allLines.length && /^[A-Z]{1,3}(\/[A-Z]{1,3})?$/.test(allLines[i + 2]))
              ? allLines[i + 2]
              : "";
            players.push({
              jersey_number: numMatch[1],
              player_name: name,
              position: pos,
            });
            i += pos ? 2 : 1;
          }
        }
      }
    }

    console.log("Parsed players:", players.length, players.slice(0, 3));

    if (players.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not parse any players from the page. The page content may require a different parsing strategy.",
          raw_preview: rosterMd.substring(0, 2000),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear old roster and insert new
    await sb.from("roster").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insertErr } = await sb.from("roster").insert(
      players.map((p) => ({
        jersey_number: p.jersey_number,
        player_name: p.player_name,
        position: p.position,
        updated_at: new Date().toISOString(),
      }))
    );

    if (insertErr) {
      console.error("Insert error:", insertErr);
      return new Response(
        JSON.stringify({ success: false, error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, count: players.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
