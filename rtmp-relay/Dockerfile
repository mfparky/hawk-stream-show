FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y nginx libnginx-mod-rtmp gettext-base && \
    rm -rf /var/lib/apt/lists/*

COPY nginx.conf.template /etc/nginx/nginx.conf.template

EXPOSE 1935 8080

# Substitute env vars into the config at startup, then run nginx
CMD ["/bin/sh", "-c", \
  "envsubst '${DEST1}${DEST2}' \
   < /etc/nginx/nginx.conf.template \
   > /etc/nginx/nginx.conf && \
   nginx -g 'daemon off;'"]
