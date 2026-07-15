FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y nginx libnginx-mod-rtmp python3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY nginx.conf.template     /etc/nginx/nginx.conf.template
COPY destination-watcher.py  /destination-watcher.py
COPY entrypoint.sh           /entrypoint.sh
RUN chmod +x /entrypoint.sh /destination-watcher.py

EXPOSE 1935 8080

# entrypoint.sh renders nginx.conf, starts the Supabase-polling watcher in the
# background, then execs nginx in the foreground.
CMD ["/entrypoint.sh"]
