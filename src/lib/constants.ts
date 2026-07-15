export const STREAM_URL_KEY     = "stream_url";
export const STREAM_AUTO_URL_KEY     = "stream_auto_url";
export const STREAM_AUTO_EXPIRES_KEY = "stream_auto_expires_at";
export const CHANNEL_ID_KEY     = "youtube_channel_id";
export const YOUTUBE_API_KEY_KEY = "youtube_api_key";
export const YOUTUBE_PLAYLIST_ID_KEY = "youtube_playlist_id";
export const VENUE_NAME_KEY     = "venue_name";
export const VENUE_ADDRESS_KEY  = "venue_address";
export const VENUE_LAT_KEY      = "venue_lat";
export const VENUE_LON_KEY      = "venue_lon";

export const RTMP_INGEST_URL_KEY  = "rtmp_ingest_url";
export const RTMP_STREAM_KEY_KEY  = "rtmp_stream_key";
export const YOUTUBE_STUDIO_URL_KEY = "youtube_studio_url";

// Outbound push destinations on the relay. The droplet watcher polls these
// every 15s and reloads nginx when they change, so /admin can rotate the
// YouTube key and per-game GameChanger key without SSH'ing to the droplet.
export const DEST_YOUTUBE_URL_KEY    = "dest_youtube_url";
export const DEST_YOUTUBE_STREAM_KEY = "dest_youtube_stream_key";
export const DEST_GC_URL_KEY         = "dest_gc_url";
export const DEST_GC_STREAM_KEY      = "dest_gc_stream_key";

// ntfy.sh topic name for stream-down alerts. Shared with new admins so
// they can subscribe in the ntfy app — separate from the droplet's
// `NTFY_TOPIC` env var (the droplet is the source of truth for what gets
// sent; this is just a place to share what to subscribe to).
export const NTFY_TOPIC_KEY = "ntfy_topic";

export const SCORE_ENABLED_KEY    = "score_enabled";
export const SCORE_HOME_TEAM_KEY  = "score_home_team";
export const SCORE_AWAY_TEAM_KEY  = "score_away_team";
export const SCORE_HOME_SCORE_KEY = "score_home_score";
export const SCORE_AWAY_SCORE_KEY = "score_away_score";
export const SCORE_STATUS_KEY     = "score_status";
