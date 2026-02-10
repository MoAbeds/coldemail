# ─── Worker Dockerfile ─────────────────────────────────
# For running BullMQ background workers separately from the web app.
# Deploy to Railway, Fly.io, or any container platform.
#
# Build: docker build -t coldclaude-worker .
# Run:   docker run --env-file .env coldclaude-worker

FROM node:20-alpine AS base
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Production image
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker
USER worker

COPY --from=deps --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=worker:nodejs /app/prisma ./prisma
COPY --chown=worker:nodejs src/lib/workers ./src/lib/workers
COPY --chown=worker:nodejs src/lib/db.ts ./src/lib/db.ts
COPY --chown=worker:nodejs src/lib/crypto.ts ./src/lib/crypto.ts
COPY --chown=worker:nodejs src/lib/personalization.ts ./src/lib/personalization.ts
COPY --chown=worker:nodejs src/lib/providers ./src/lib/providers
COPY --chown=worker:nodejs src/lib/email.ts ./src/lib/email.ts
COPY --chown=worker:nodejs src/lib/email-connection.ts ./src/lib/email-connection.ts
COPY --chown=worker:nodejs src/lib/email-health.ts ./src/lib/email-health.ts
COPY --chown=worker:nodejs src/lib/queue.ts ./src/lib/queue.ts
COPY --chown=worker:nodejs src/lib/scheduling.ts ./src/lib/scheduling.ts
COPY --chown=worker:nodejs tsconfig.json ./
COPY --chown=worker:nodejs package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["npx", "tsx", "src/lib/workers/index.ts"]
