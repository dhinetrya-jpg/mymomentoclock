FROM golang:1.22-alpine AS builder
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
COPY . /app

EXPOSE 8080
CMD ["./astroengine_server"]
