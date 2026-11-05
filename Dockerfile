FROM golang:1.22-alpine AS builder
RUN apk add --no-cache gcc musl-dev g++ make git wget tar

RUN wget -O /tmp/swisseph.tar.gz https://www.astro.com/ftp/swisseph/swisseph-2.10.01.tar.gz \
    && tar -xzf /tmp/swisseph.tar.gz -C /tmp \
    && make -C /tmp/swisseph-2.10.01/src lib \
    && install -D -m 0644 /tmp/swisseph-2.10.01/src/libswe.a /usr/local/lib/libswe.a \
    && rm -rf /tmp/swisseph*
RUN apk add --no-cache gcc musl-dev g++ make git

WORKDIR /app
COPY backend/ ./backend/

WORKDIR /app/backend
RUN go mod tidy || true
RUN CGO_ENABLED=1 go build -o astroengine_server ./cmd/server/main.go

FROM alpine:latest
RUN apk add --no-cache libc6-compat ca-certificates
WORKDIR /root/
COPY --from=builder /app/backend/astroengine_server .
COPY frontend/ ../frontend/

EXPOSE 8080
CMD ["./astroengine_server"]
