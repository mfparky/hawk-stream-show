const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

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

    // Ensure we're hitting the roster page
    const rosterUrl = teamUrl.replace(/\/?$/, "/roster");
    console.log("Scraping roster from:", rosterUrl);

    // Scrape with Firecrawl
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: rosterUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl scrape failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData?.data?.markdown ?? scrapeData?.markdown ?? "";
    console.log("Scraped markdown length:", markdown.length);
    console.log("Scraped markdown preview:", markdown.substring(0, 500));

    // Parse roster from markdown
    // GC roster pages typically list players as lines like:
    //   #12 John Smith | OF
    //   12 | John Smith | Outfield
    // Or in markdown table format:
    //   | # | Name | Position |
    //   | 12 | John Smith | OF |
    const players: { jersey_number: string; player_name: string; position: string }[] = [];
    const lines = markdown.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") && !trimmed.match(/^#\d/)) continue;

      // Pattern: markdown table row  | 12 | John Smith | OF |
      const tableMatch = trimmed.match(
        /\|\s*#?(\d{1,3})\s*\|\s*([A-Za-z][A-Za-z\s.'-]+?)\s*\|\s*([A-Za-z/\s]+?)\s*\|?/
      );
      if (tableMatch) {
        players.push({
          jersey_number: tableMatch[1].trim(),
          player_name: tableMatch[2].trim(),
          position: tableMatch[3].trim(),
        });
        continue;
      }

      // Pattern: #12 John Smith - OF  or  #12 John Smith | OF
      const hashMatch = trimmed.match(
        /^#(\d{1,3})\s+([A-Za-z][A-Za-z\s.'-]+?)(?:\s*[-|]\s*([A-Za-z/\s]+))?$/
      );
      if (hashMatch) {
        players.push({
          jersey_number: hashMatch[1].trim(),
          player_name: hashMatch[2].trim(),
          position: hashMatch[3]?.trim() ?? "",
        });
        continue;
      }

      // Pattern: 12 | John Smith | OF
      const pipeMatch = trimmed.match(
        /^(\d{1,3})\s*\|\s*([A-Za-z][A-Za-z\s.'-]+?)\s*\|\s*([A-Za-z/\s]+)/
      );
      if (pipeMatch) {
        players.push({
          jersey_number: pipeMatch[1].trim(),
          player_name: pipeMatch[2].trim(),
          position: pipeMatch[3].trim(),
        });
      }
    }

    console.log("Parsed players:", players.length);

    if (players.length === 0) {
      // Store the raw markdown so we can debug parsing
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not parse any players from the page",
          raw_preview: markdown.substring(0, 2000),
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
