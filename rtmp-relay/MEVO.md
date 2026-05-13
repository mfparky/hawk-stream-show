# Streaming from the Mevo app

This guide walks through pointing a Mevo camera at the RTMP relay so the
stream shows up on the site and is forwarded to YouTube + GameChanger.

```
┌────────┐   RTMP    ┌──────────────┐   RTMP   ┌──────────┐
│  Mevo  │──────────▶│  RTMP relay  │─────────▶│ YouTube  │
│  app   │           │ (nginx-rtmp) │     │    │ GameChgr │
└────────┘           └──────────────┘     └───▶└──────────┘
                            │
                            │ stats
                            ▼
                       Supabase ──▶ /relay page
```

## What you need

- A Mevo camera + the **Mevo Multicam** app (iOS/Android), signed in with a
  **Mevo Plus / Pro** account — *Custom RTMP* is a paid-tier feature.
- The relay's public IP or hostname (the same server that runs
  `docker compose up` from this folder). Default RTMP port is **1935**.
- The site's `/relay` page open on a phone or laptop so you can confirm the
  stream is live.

## One-time: set up a Custom RTMP destination in Mevo

1. Open the **Mevo Multicam** app and tap your camera to connect.
2. Tap the **broadcast / share** icon (top-right on the camera preview).
3. Choose **Custom RTMP** (under *More platforms* — not YouTube/Facebook).
4. Fill in:

   | Field           | Value                                      |
   | --------------- | ------------------------------------------ |
   | **Name**        | e.g. `Field relay`                         |
   | **RTMP URL**    | `rtmp://SERVER_IP:1935/live`               |
   | **Stream Key**  | anything non-empty, e.g. `mevo`            |
   | **Username**    | leave blank                                |
   | **Password**    | leave blank                                |

   The relay's `application live { ... }` block (see
   `nginx.conf.template`) accepts any stream key on the `/live` path, so
   the key value itself doesn't matter — pick something memorable.

5. Tap **Save**. The destination now appears in the broadcast sheet.

## Recommended encoding settings

Set these from the broadcast sheet → **Settings** (gear icon) before going
live. The relay just forwards bytes, so the bitrate Mevo sends is what
YouTube and GameChanger will receive.

| Setting     | Recommended       | Notes                                       |
| ----------- | ----------------- | ------------------------------------------- |
| Resolution  | **1080p**         | Drop to 720p if you're on weak LTE.         |
| Frame rate  | **30 fps**        | 60 fps doubles bitrate for little benefit.  |
| Bitrate     | **4–6 Mbps**      | YouTube's 1080p30 sweet spot.               |
| Keyframe    | **2 s**           | Required by YouTube; GameChanger is happy.  |
| Audio       | AAC, 128 kbps     | Mevo default — leave alone.                 |

If the **Source** bandwidth on `/relay` keeps dipping, the upload link is
the bottleneck — drop to 720p / 3 Mbps.

## Going live

1. In Mevo, make sure **Custom RTMP → Field relay** is toggled on in the
   broadcast destinations list. (Other destinations like YouTube/Facebook
   *direct* should normally be **off** — the relay is what fans out.)
2. Tap the big red **Go Live** button.
3. Open `https://<your-site>/relay` on a phone:
   - **Source** dot should turn green within ~5 seconds and show "Mevo".
   - **YouTube** and **GameChanger** dots should follow once the relay
     opens its push connections (usually 2–5 s later).
   - The big banner flips to **LIVE** with the incoming bitrate.
4. The home page (`/`) auto-detects the YouTube live broadcast and embeds
   it once YouTube reports the stream as active (typically 10–30 s after
   the relay starts pushing).

## Stopping the stream

Tap **End broadcast** in the Mevo app. Within a few seconds:

- `/relay` flips back to **OFFLINE**.
- YouTube ends the live broadcast (and may auto-publish a VOD depending
  on your YouTube Studio settings).

## Troubleshooting

| Symptom on `/relay`                         | Likely cause / fix                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Source: No input** after Go Live          | Wrong RTMP URL in Mevo, or port 1935 blocked. Check `SERVER_IP` and firewall.      |
| Source green, **YouTube** red               | YouTube stream key in `rtmp-relay/.env` (`DEST1`) is wrong/expired. Rotate it.     |
| Source green, **GameChanger** red           | Game not started in GameChanger, or `DEST2` URL/key stale. Re-grab from GC app.    |
| Bitrate flapping / "Source" pulsing offline | Weak uplink. Lower Mevo bitrate, or move closer to the hotspot/router.             |
| `/relay` shows "Relay server not configured"| Set the stats URL once: `http://SERVER_IP:8080/stat` in the **Relay server URL** panel. |
| Page shows OFFLINE but Mevo says live       | The stats-pusher container probably crashed. `docker compose ps` on the relay host. |

## Rotating the YouTube key

YouTube keys can be regenerated from **YouTube Studio → Go Live → Stream
settings**. After rotating, update `DEST1` in `rtmp-relay/.env` and
restart the relay:

```sh
docker compose up -d --force-recreate rtmp-relay
```

GameChanger keys live in the GameChanger app under **Streaming** — same
flow, update `DEST2` and recreate.
