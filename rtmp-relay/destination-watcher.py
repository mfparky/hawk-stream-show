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
    # `nginx -s reload` re-reads the config but for nginx-rtmp this rebuilds
    # the `application live` block, which drops any active publisher session.
    # Mevo would see "RTMP relay failed" and have to reconnect, killing the
    # live stream for several seconds. has_active_publisher() is the gate
    # that keeps us from reloading mid-broadcast.
    subprocess.run(["nginx", "-s", "reload"], check=True)


STATS_URL_LOCAL = "http://127.0.0.1:8080/stat"


def has_active_publisher() -> bool:
    """True if nginx-rtmp's /stat shows a publisher (Mevo) currently connected.

    Used to defer destination changes mid-broadcast: applying them now would
    cause `nginx -s reload` to drop Mevo, which is the bug that surfaced as
    a mid-stream 'RTMP relay failed' toast in the Mevo app.

    Fail-safe: if /stat is unreachable (nginx restarting, etc.), return False
    so we don't get stuck deferring forever.
    """
    try:
        with urllib.request.urlopen(STATS_URL_LOCAL, timeout=3) as r:
            xml = r.read().decode()
    except Exception:
        return False
    # nginx-rtmp marks the publisher client with a self-closing <publishing/>
    # tag inside its <client> element. Push children (the relay's outbound
    # connections to YouTube / GameChanger) don't have this tag.
    return "<publishing/>" in xml


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
    """Poll Supabase forever; reload nginx when destinations change.

    Defers reloads while a publisher is active so we don't drop Mevo
    mid-broadcast — any pending change applies as soon as the stream ends.
    """
    print("destination-watcher loop starting…", flush=True)
    last = resolve_destinations()
    deferred_logged = False  # avoid log-spam during a long broadcast
    while True:
        time.sleep(INTERVAL)
        try:
            current = resolve_destinations()
            if current == last:
                continue

            if has_active_publisher():
                if not deferred_logged:
                    print(
                        f"deferring reload — active publisher; will apply when stream ends. "
                        f"pending: DEST1={mask(current[0])} DEST2={mask(current[1])}",
                        flush=True,
                    )
                    deferred_logged = True
                continue

            write_config(*current)
            reload_nginx()
            print(f"reloaded: DEST1={mask(current[0])} DEST2={mask(current[1])}", flush=True)
            last = current
            deferred_logged = False
        except Exception as e:
            print(f"loop error: {e}", flush=True)


if __name__ == "__main__":
    if "--once" in sys.argv:
        run_once()
    else:
        run_loop()
