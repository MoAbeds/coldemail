# ColdClaude Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel     │────▶│  Supabase    │     │   Upstash    │
│  (Next.js)   │     │ (PostgreSQL) │     │   (Redis)    │
└──────┬──────┘     └──────────────┘     └──────┬───────┘
       │                                        │
       │  Cron triggers                         │
       ▼                                        ▼
┌──────────────┐                         ┌──────────────┐
│  Cron Jobs   │─── enqueue ────────────▶│   BullMQ     │
│  (Vercel)    │                         │   Worker     │
└──────────────┘                         │ (Docker/Fly) │
                                         └──────────────┘
```

- **Web App**: Vercel (Next.js App Router)
- **Database**: Supabase (PostgreSQL) or any PostgreSQL provider
- **Queue/Cache**: Upstash Redis or any Redis provider
- **Worker**: Docker container on Railway, Fly.io, or Render
- **Cron Jobs**: Vercel Cron (configured in `vercel.json`)

---

## Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase recommended)
- Redis instance (Upstash recommended for serverless)
- Vercel account (for web app hosting)
- Container hosting account (Railway/Fly.io for worker)

---

## Environment Variables

Copy `.env.example` and fill in all values:

```bash
cp .env.example .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | Your app's public URL | `https://app.coldclaude.com` |
| `NEXTAUTH_SECRET` | Random 32+ char secret | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | 32-byte hex key for credential encryption | `openssl rand -hex 32` |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis connection string for BullMQ |
| `SENTRY_DSN` | Sentry error tracking DSN |
| `CRON_SECRET` | Secret for authenticating cron endpoints |
| `GOOGLE_CLIENT_ID` | OAuth: Google sign-in |
| `GOOGLE_CLIENT_SECRET` | OAuth: Google sign-in |

---

## Database Setup

### 1. Create Database (Supabase)

1. Create a new Supabase project
2. Copy the connection string from Settings → Database → Connection string (URI)
3. Set `DATABASE_URL` in your environment

### 2. Run Migrations

```bash
npx prisma migrate deploy
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

---

## Web App Deployment (Vercel)

### 1. Connect Repository

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link
```

### 2. Set Environment Variables

```bash
# Set each variable in Vercel
vercel env add DATABASE_URL
vercel env add NEXTAUTH_URL
vercel env add NEXTAUTH_SECRET
vercel env add ENCRYPTION_KEY
vercel env add CRON_SECRET
```

Or set them in the Vercel dashboard under Settings → Environment Variables.

### 3. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### 4. Cron Jobs

Cron jobs are configured in `vercel.json` and activate automatically on Vercel Pro/Enterprise plans:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/reset-daily-limits` | Daily at midnight UTC | Reset email account send counters |
| `/api/cron/check-replies` | Every 5 minutes | Check for email replies |
| `/api/cron/process-queue` | Every minute | Send queued emails |
| `/api/cron/update-analytics` | Every hour | Update lead temperatures |

All cron endpoints are protected by `CRON_SECRET`. Vercel automatically sends the secret via the `Authorization: Bearer` header.

---

## Worker Deployment (Docker)

The BullMQ worker processes background jobs (email sending, reply checking). It runs as a separate container.

### 1. Build Image

```bash
docker build -t coldclaude-worker .
```

### 2. Run Locally

```bash
docker run --env-file .env coldclaude-worker
```

### 3. Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

### 4. Deploy to Fly.io

```bash
# Install flyctl
# See: https://fly.io/docs/getting-started/installing-flyctl/

fly launch --no-deploy
fly secrets set DATABASE_URL="..." REDIS_URL="..." ENCRYPTION_KEY="..."
fly deploy
```

### Local Development Stack

Use Docker Compose for local development with all services:

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, and the worker container with health checks.

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Lint & Type Check** — ESLint + TypeScript `--noEmit`
2. **Unit & Integration Tests** — Jest with coverage
3. **Production Build** — Verifies the app builds
4. **E2E Tests** — Playwright (on pull requests only)
5. **Deploy** — Automatic Vercel deployment on push to `main`

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `DATABASE_URL` | For running migrations post-deploy |
| `PRODUCTION_URL` | For health check after deploy |

---

## Monitoring

### Health Check

```bash
curl https://app.coldclaude.com/api/health
```

Returns system status (`healthy`, `degraded`, `unhealthy`) with database latency, Redis connectivity, and memory usage.

### Admin Dashboard

Navigate to `/admin/monitoring` in the app (requires owner permission). Shows:

- System health (DB, Redis, memory, uptime)
- Email sending metrics and rates
- Error rates and bounce tracking
- Email account capacity usage
- Lead temperature distribution

Auto-refreshes every 30 seconds.

### Sentry (Optional)

Set `SENTRY_DSN` to enable error tracking. The lightweight integration sends errors directly to Sentry's HTTP API without requiring the `@sentry/nextjs` package.

---

## Scaling Considerations

### Database
- Enable connection pooling (Supabase has PgBouncer built-in)
- Add read replicas for analytics queries if needed
- Monitor slow queries via Supabase dashboard

### Redis
- Upstash serverless Redis scales automatically
- For self-hosted Redis, monitor memory usage and eviction policies

### Worker
- Scale horizontally by running multiple worker containers
- BullMQ handles job distribution across workers automatically
- Monitor queue depth via BullMQ dashboard or Redis CLI

### Email Sending
- Daily limits are enforced per email account (`dailyLimit` field)
- The process-queue cron caps at 10 emails per campaign per minute
- Add more email accounts to increase aggregate throughput

---

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is a strong random value (32+ chars)
- [ ] `ENCRYPTION_KEY` is a 32-byte hex string
- [ ] `CRON_SECRET` is set in production
- [ ] Database credentials use least-privilege access
- [ ] OAuth secrets are configured for Google/Microsoft sign-in
- [ ] CORS and CSP headers are configured
- [ ] Rate limiting is enabled on auth endpoints
- [ ] Audit logging is active for sensitive operations
- [ ] SSL/TLS is enforced on all connections

---

## Troubleshooting

### Build Fails
```bash
# Regenerate Prisma client
npx prisma generate

# Check for type errors
npx tsc --noEmit
```

### Database Connection Issues
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db?sslmode=require`
- Check that IP allowlisting includes your deployment's IPs
- Enable connection pooling for serverless environments

### Cron Jobs Not Running
- Vercel Cron requires Pro or Enterprise plan
- Verify `CRON_SECRET` is set in Vercel environment variables
- Check Vercel logs for cron execution: Vercel Dashboard → Deployments → Functions tab

### Worker Not Processing Jobs
- Verify `REDIS_URL` is accessible from the worker container
- Check worker logs: `docker logs <container-id>`
- Verify Redis connectivity: `redis-cli -u $REDIS_URL ping`

### Email Sending Issues
- Check email account health at `/admin/monitoring`
- Verify SMTP/OAuth credentials are valid
- Review bounce and error rates in the dashboard
- Check that daily limits haven't been reached
