import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Server-side proxy for YouTube Data API v3.
// Avoids HTTP-referrer restrictions on the browser API key.
// Uses VITE_YOUTUBE_API_KEY secret (server-to-server, no Referer header sent).

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("VITE_YOUTUBE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing VITE_YOUTUBE_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    let upstream: string;
    if (action === "live") {
      const channelId = url.searchParams.get("channelId");
      if (!channelId) {
        return new Response(JSON.stringify({ error: "channelId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      upstream =
        `https://www.googleapis.com/youtube/v3/search` +
        `?channelId=${encodeURIComponent(channelId)}` +
        `&eventType=live&type=video&part=id&maxResults=1&key=${apiKey}`;
    } else if (action === "playlist") {
      const playlistId = url.searchParams.get("playlistId");
      if (!playlistId) {
        return new Response(JSON.stringify({ error: "playlistId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      upstream =
        `https://www.googleapis.com/youtube/v3/playlistItems` +
        `?part=snippet&maxResults=25&playlistId=${encodeURIComponent(playlistId)}&key=${apiKey}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(upstream);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
