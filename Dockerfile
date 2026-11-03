# ============================================================================
# MYMOMENTOCLOCK PRODUCTION MULTI-STAGE DOCKERFILE
# Links Go orchestration tier with native C++ Ephemeris Bridge
# ============================================================================

# Stage 1: Build C++ Native Ephemeris Library & Node/Go Orchestrator
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache g++ make python3

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/schema.sql ./schema.sql

EXPOSE 3000

CMD ["npx", "tsx", "server.ts"]
