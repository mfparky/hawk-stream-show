#!/usr/bin/env python3
"""
Polls the nginx-rtmp /stat XML endpoint every 5 seconds.

Does two things:

1. Upserts the parsed state into a Supabase `rtmp_stats` table so the
   frontend can read live stream health.

2. If NTFY_TOPIC is configured, sends a push notification via
   https://ntfy.sh when the stream goes degraded for more than
   ALERT_DELAY_SEC seconds, and again when it recovers. Lets the
   operator know when a destination (YouTube or GameChanger) drops
   without having to watch /relay.

Required env vars (same .env file as the relay):
  SUPABASE_URL  — e.g. https://xxxx.supabase.co
  SUPABASE_KEY  — anon/service-role key

Optional env vars for push alerts:
  NTFY_TOPIC          — ntfy.sh topic name (anything random + unguessable).
                        Subscribe in the ntfy app on your phone. Empty = no alerts.
  EXPECTED_PUSH_COUNT — number of push destinations that should be alive
                        when streaming (default 2: YouTube + GameChanger).
  ALERT_DELAY_SEC     — seconds the stream must stay degraded before
                        firing an alert (default 30 — covers reconnect
                        windows; long enough to avoid noise).
  RELAY_LINK          — URL to open when the operator taps the notification
                        (default https://streamthehawks.ca/relay).
"""

import os, re, time, json, urllib.request, urllib.error

STATS_URL    = "http://rtmp-relay:8080/stat"
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
TABLE_URL    = f"{SUPABASE_URL}/rest/v1/rtmp_stats"
INTERVAL     = 5  # seconds

NTFY_TOPIC          = os.environ.get("NTFY_TOPIC", "").strip()
EXPECTED_PUSH_COUNT = int(os.environ.get("EXPECTED_PUSH_COUNT", "2"))
ALERT_DELAY_SEC     = int(os.environ.get("ALERT_DELAY_SEC", "30"))
RELAY_LINK          = os.environ.get("RELAY_LINK", "https://streamthehawks.ca/relay")


# ── Stats parsing ────────────────────────────────────────────────────────

def get(xml: str, tag: str) -> str:
    m = re.search(rf"<{tag}>([^<]*)</{tag}>", xml)
    return m.group(1).strip() if m else ""


def parse(xml: str) -> dict:
    live          = "<stream>" in xml
    bw_in         = int(get(xml, "bw_in")  or 0)
    width         = int(get(xml, "width")  or 0)
    height        = int(get(xml, "height") or 0)
    push_count    = xml.count("ngx-local-relay")
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


# ── Supabase upsert ──────────────────────────────────────────────────────

def push_to_supabase(data: dict) -> None:
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


# ── Alerting via ntfy.sh ─────────────────────────────────────────────────

alert_state = {
    "bad_since": None,   # timestamp when stream went degraded; None when ok / no stream
    "alerted":   False,  # have we already fired the outage alert
}


def notify(message: str, *, priority: str = "default", tags: str = "") -> None:
    """POST a push notification to ntfy.sh. No-op if NTFY_TOPIC unset."""
    if not NTFY_TOPIC:
        return
    try:
        req = urllib.request.Request(
            f"https://ntfy.sh/{NTFY_TOPIC}",
            data=message.encode("utf-8"),
            headers={
                "Title":    "Hawks stream",
                "Priority": priority,
                "Tags":     tags,
                "Click":    RELAY_LINK,
            },
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"ntfy notify failed: {e}", flush=True)


def classify(data: dict) -> str:
    """One of: ok | no_stream | src_only | partial | all_down."""
    src  = data["src_connected"]
    push = data["push_count"]
    if not src and push == 0:
        return "no_stream"          # nothing happening — not an alert
    if not src:
        return "src_only"           # source down but a push lingers (unusual)
    if push >= EXPECTED_PUSH_COUNT:
        return "ok"
    if push == 0:
        return "all_down"
    return "partial"


def alert_message(state: str, push: int) -> str:
    if state == "src_only":
        return "Mevo source disconnected from the relay — stream is dropping."
    if state == "all_down":
        return f"All push destinations dropped (0/{EXPECTED_PUSH_COUNT} alive). Stream is down on YouTube and GameChanger."
    if state == "partial":
        return (
            f"One push destination dropped ({push}/{EXPECTED_PUSH_COUNT} alive). "
            f"Check YouTube and GameChanger — the other is still streaming."
        )
    return ""


def check_alerts(data: dict) -> None:
    """Detect ok→degraded and degraded→ok transitions with a debounce."""
    if not NTFY_TOPIC:
        return
    state = classify(data)
    now   = time.time()

    if state == "no_stream":
        # Reset — pre-game / post-game silence is not an outage.
        alert_state["bad_since"] = None
        alert_state["alerted"]   = False
        return

    if state == "ok":
        if alert_state["alerted"] and alert_state["bad_since"] is not None:
            duration = int(now - alert_state["bad_since"])
            notify(
                f"Stream recovered after {duration}s — "
                f"{data['push_count']}/{EXPECTED_PUSH_COUNT} destinations alive.",
                tags="white_check_mark",
            )
        alert_state["bad_since"] = None
        alert_state["alerted"]   = False
        return

    # state ∈ {src_only, partial, all_down}
    if alert_state["bad_since"] is None:
        alert_state["bad_since"] = now
    if (not alert_state["alerted"]) and (now - alert_state["bad_since"]) >= ALERT_DELAY_SEC:
        notify(
            alert_message(state, data["push_count"]),
            priority="high",
            tags="rotating_light",
        )
        alert_state["alerted"] = True


# ── Main loop ────────────────────────────────────────────────────────────

print(f"stats-pusher starting… (alerts: {'on' if NTFY_TOPIC else 'off'})", flush=True)
while True:
    try:
        xml  = fetch_xml()
        data = parse(xml)
        # Check alerts first so a Supabase outage doesn't suppress them.
        try:
            check_alerts(data)
        except Exception as e:
            print(f"alert check failed: {e}", flush=True)
        try:
            push_to_supabase(data)
        except Exception as e:
            print(f"supabase upsert failed: {e}", flush=True)
        print(f"pushed: live={data['live']} bw_in={data['bw_in']} "
              f"push_count={data['push_count']}", flush=True)
    except Exception as e:
        print(f"error: {e}", flush=True)
    time.sleep(INTERVAL)
