// Proxy for the nginx-rtmp /stat XML endpoint.
// The browser can't fetch http:// from an https:// page (mixed content), so
// this Edge Function fetches server-side and returns the XML over HTTPS.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const { searchParams } = new URL(req.url);
  const statsUrl = searchParams.get("url");

  if (!statsUrl || !/^https?:\/\/.+\/stat/.test(statsUrl)) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid url param — must end with /stat" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  try {
    const res = await fetch(statsUrl, { signal: AbortSignal.timeout(5000) });
    const xml = await res.text();
    return new Response(xml, {
      headers: { ...CORS, "Content-Type": "application/xml" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
