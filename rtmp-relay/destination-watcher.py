#!/usr/bin/env python3
"""
Polls Supabase `settings` for the YouTube + GameChanger RTMP destinations
and reloads nginx whenever they change. Lets the operator rotate the
per-game GameChanger key (and the YouTube key) from /admin in a browser,
without SSH'ing to the droplet.

Required env vars (same .env file as the relay):
  SUPABASE_URL  — e.g. https://xxxx.supabase.co
  SUPABASE_KEY  — anon or service-role key (read-only is enough)

Bootstrap fallback (used at boot before the first successful Supabase poll,
and any time a destination is missing from /admin):
  DEST1  — initial YouTube push URL (full URL incl. stream key)
  DEST2  — initial GameChanger push URL (full URL incl. stream key)

Run modes:
  --once   Render nginx.conf one time and exit. Used by entrypoint.sh before
           nginx starts so the very first config is up-to-date.
  (none)   Loop forever, reloading nginx when destinations change.
"""

import os, sys, time, json, subprocess, urllib.request, urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
INTERVAL     = 15  # seconds

TEMPLATE_PATH = "/etc/nginx/nginx.conf.template"
TARGET_PATH   = "/etc/nginx/nginx.conf"
PLACEHOLDER   = "# __DEST_LINES__"

KEYS = {
    "youtube_url": "dest_youtube_url",
    "youtube_key": "dest_youtube_stream_key",
    "gc_url":      "dest_gc_url",
    "gc_key":      "dest_gc_stream_key",
}

FALLBACK_DEST1 = os.environ.get("DEST1", "")
FALLBACK_DEST2 = os.environ.get("DEST2", "")


def join_url_and_key(url: str, key: str) -> str:
    """Combine an RTMP URL with a stream key, tolerating a trailing slash."""
    url, key = url.strip(), key.strip()
    if not url or not key:
        return ""
    return url.rstrip("/") + "/" + key


def fetch_from_supabase() -> dict:
    """Returns a {settings_key: value} dict. Raises on failure."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_KEY not set")
    url = f"{SUPABASE_URL}/rest/v1/settings?select=key,value"
    req = urllib.request.Request(url, headers={
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req, timeout=8) as r:
        rows = json.loads(r.read().decode())
    return {row["key"]: (row.get("value") or "") for row in rows}


def resolve_destinations() -> tuple[str, str]:
    """Read destinations from Supabase, falling back to env vars."""
    try:
        cfg = fetch_from_supabase()
        d1  = join_url_and_key(cfg.get(KEYS["youtube_url"], ""),
                               cfg.get(KEYS["youtube_key"], ""))
        d2  = join_url_and_key(cfg.get(KEYS["gc_url"],      ""),
                               cfg.get(KEYS["gc_key"],      ""))
    except Exception as e:
        print(f"supabase fetch failed: {e} — using .env fallback", flush=True)
        d1, d2 = "", ""
    return (d1 or FALLBACK_DEST1, d2 or FALLBACK_DEST2)


def render_config(dest1: str, dest2: str) -> str:
    with open(TEMPLATE_PATH) as f:
        template = f.read()
    push_lines = []
    if dest1: push_lines.append(f"            push {dest1};")
    if dest2: push_lines.append(f"            push {dest2};")
    return template.replace(PLACEHOLDER, "\n".join(push_lines) if push_lines else "# (no destinations configured)")


def write_config(dest1: str, dest2: str) -> None:
    cfg = render_config(dest1, dest2)
    with open(TARGET_PATH, "w") as f:
        f.write(cfg)


def reload_nginx() -> None:
    # SIGHUP-equivalent: graceful, keeps active RTMP streams alive across reload.
    subprocess.run(["nginx", "-s", "reload"], check=True)


def mask(url: str) -> str:
    """Hide all but the last 4 chars of the stream key when logging."""
    if not url:
        return "(empty)"
    parts = url.rsplit("/", 1)
    if len(parts) == 2 and len(parts[1]) > 4:
        return parts[0] + "/…" + parts[1][-4:]
    return url


def run_once() -> None:
    """Render initial nginx.conf and exit. Called by entrypoint.sh."""
    d1, d2 = resolve_destinations()
    write_config(d1, d2)
    print(f"initial render: DEST1={mask(d1)} DEST2={mask(d2)}", flush=True)


def run_loop() -> None:
    """Poll Supabase forever; reload nginx when destinations change."""
    print("destination-watcher loop starting…", flush=True)
    last = resolve_destinations()
    while True:
        time.sleep(INTERVAL)
        try:
            current = resolve_destinations()
            if current != last:
                write_config(*current)
                reload_nginx()
                print(f"reloaded: DEST1={mask(current[0])} DEST2={mask(current[1])}", flush=True)
                last = current
        except Exception as e:
            print(f"loop error: {e}", flush=True)


if __name__ == "__main__":
    if "--once" in sys.argv:
        run_once()
    else:
        run_loop()
