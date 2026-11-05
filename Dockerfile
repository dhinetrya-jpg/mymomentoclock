# syntax=docker/dockerfile:1
FROM golang:1.22-bookworm AS builder
WORKDIR /app
# This image includes gcc, g++, make and git. Optional CA mount supports managed proxies.
COPY scripts/install-swisseph.sh /usr/local/bin/install-swisseph
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export GIT_SSL_CAINFO=/run/secrets/proxy_ca; fi; \
    install-swisseph
COPY backend/go.mod backend/go.sum ./backend/
WORKDIR /app/backend
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    go mod download
COPY backend/ ./
RUN CGO_ENABLED=1 go test -mod=readonly ./... && \
    CGO_ENABLED=1 go build -mod=readonly -trimpath -o /app/astroengine_server ./cmd/server

# Optional CI target compiles the root legacy module and executes its real tests.
FROM builder AS root-tests
WORKDIR /root-tests
COPY go.mod go.sum *.go *.cpp ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    CGO_ENABLED=1 go test -mod=readonly -v ./...

FROM debian:bookworm-slim AS runtime
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates libstdc++6 tzdata && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/astroengine_server ./astroengine_server
COPY --from=builder /usr/local/share/licenses/swisseph /usr/share/licenses/swisseph
ENV PORT=8080
EXPOSE 8080
USER 65532:65532
CMD ["./astroengine_server"]
