# storage-daemon/Dockerfile
#
# tonutils-storage (xssnick/tonutils-storage) — реальный демон TON Storage,
# нужен для POST /api/v1/create (bagID из файлов на диске). Precompiled
# Linux AMD64 бинарник, не билдим из исходников (Go-тулчейна в проекте нет).
# --daemon: без интерактивного CLI, иначе процесс ждёт stdin и падает под
# Docker. Порт API НЕ пробрасывается наружу в docker-compose.yml — доступен
# только backend-контейнеру внутри app-network.

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fL -o /usr/local/bin/tonutils-storage \
      https://github.com/xssnick/tonutils-storage/releases/latest/download/tonutils-storage-linux-amd64 \
    && chmod +x /usr/local/bin/tonutils-storage

WORKDIR /data

EXPOSE 8192

ENTRYPOINT ["/bin/sh", "-c", "exec tonutils-storage --daemon --api 0.0.0.0:8192 --api-login \"$STORAGE_API_LOGIN\" --api-password \"$STORAGE_API_PASSWORD\" --db /data/db"]
