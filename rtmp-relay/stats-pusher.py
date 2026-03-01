#!/usr/bin/env python3
"""
Polls the nginx-rtmp /stat XML endpoint every 5 seconds and upserts
the results into a Supabase `rtmp_stats` table so the frontend can
read live stream health without any browser mixed-content issues.

Required env vars (same .env file as the relay):
  SUPABASE_URL  — e.g. https://xxxx.supabase.co
  SUPABASE_KEY  — anon/service-role key
"""

import os, re, time, json, urllib.request, urllib.error

STATS_URL   = "http://rtmp-relay:8080/stat"
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
TABLE_URL    = f"{SUPABASE_URL}/rest/v1/rtmp_stats"
INTERVAL     = 5  # seconds


def get(xml: str, tag: str) -> str:
    m = re.search(rf"<{tag}>([^<]*)</{tag}>", xml)
    return m.group(1).strip() if m else ""


def parse(xml: str) -> dict:
    live         = "<stream>" in xml
    bw_in        = int(get(xml, "bw_in")  or 0)
    width        = int(get(xml, "width")  or 0)
    height       = int(get(xml, "height") or 0)
    push_count   = xml.count("ngx-local-relay")
    # Source is a publisher that isn't an internal relay client
    src_connected = live and ("FMLE" in xml or "OBS" in xml or "Larix" in xml)
    return {
        "id":             1,
        "live":           live,
        "bw_in":          bw_in,
        "width":          width,
        "height":         height,
        "push_count":     push_count,
        "src_connected":  src_connected,
        "updated_at":     time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def push(data: dict) -> None:
    body = json.dumps([data]).encode()
    req  = urllib.request.Request(
        TABLE_URL + "?on_conflict=id",
        data=body,
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "resolution=merge-duplicates",
        },
        method="POST",
    )
    urllib.request.urlopen(req, timeout=8)


def fetch_xml() -> str:
    with urllib.request.urlopen(STATS_URL, timeout=5) as r:
        return r.read().decode()


print("stats-pusher starting…", flush=True)
while True:
    try:
        xml  = fetch_xml()
        data = parse(xml)
        push(data)
        print(f"pushed: live={data['live']} bw_in={data['bw_in']} "
              f"push_count={data['push_count']}", flush=True)
    except Exception as e:
        print(f"error: {e}", flush=True)
    time.sleep(INTERVAL)
