#!/bin/sh
set -e

# Render nginx.conf once before nginx starts. Uses Supabase values if reachable,
# otherwise falls back to DEST1 / DEST2 from .env.
python3 /destination-watcher.py --once

# Background watcher: polls Supabase and reloads nginx when destinations change.
# Only run it if Supabase credentials are configured.
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  python3 /destination-watcher.py &
else
  echo "SUPABASE_URL / SUPABASE_KEY not set — destination-watcher disabled (using .env only)"
fi

# nginx runs in the foreground as the main container process.
exec nginx -g 'daemon off;'
