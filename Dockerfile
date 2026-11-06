# syntax=docker/dockerfile:1
FROM golang:1.26-bookworm AS builder
WORKDIR /app
# This image includes gcc, g++, make and git. Optional CA mount supports managed proxies.
COPY scripts/install-swisseph.sh /usr/local/bin/install-swisseph
RUN chmod +x /usr/local/bin/install-swisseph
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export GIT_SSL_CAINFO=/run/secrets/proxy_ca; fi; \
    sh /usr/local/bin/install-swisseph
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

# Separate commercial artifact. An empty build trust root always refuses production.
FROM builder AS commercial-builder
ARG PAYMENT_OWNER_PUBLIC_KEY_HEX=""
RUN set -eu; case "$PAYMENT_OWNER_PUBLIC_KEY_HEX" in *[!0-9a-f]* ) exit 1;; esac; \
    test -z "$PAYMENT_OWNER_PUBLIC_KEY_HEX" || test "${#PAYMENT_OWNER_PUBLIC_KEY_HEX}" -eq 64; \
    CGO_ENABLED=1 go build -mod=readonly -trimpath -ldflags "-X main.releaseTrustPublicKeyHex=$PAYMENT_OWNER_PUBLIC_KEY_HEX" -o /app/payment-commercial ./cmd/payment-commercial && \
    CGO_ENABLED=1 go build -mod=readonly -trimpath -o /app/payment-observer ./cmd/payment-observer
FROM runtime AS commercial
COPY --from=commercial-builder /app/payment-commercial /app/payment-commercial
COPY --from=commercial-builder /app/payment-observer /app/payment-observer
EXPOSE 8443 8444
CMD ["/app/payment-commercial"]
# Preserve the standard disabled native image as the default build output.
FROM runtime AS default
