export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: string; latencyMs?: number; error?: string };
    redis: { status: string; error?: string };
    memory: { heapUsedMB: number; heapTotalMB: number; rsseMB: number };
  };
}

const startTime = Date.now();

/**
 * GET /api/health — Health check endpoint for monitoring and load balancers.
 * Returns system status without requiring authentication.
 */
export async function GET() {
  const checks: HealthCheck["checks"] = {
    database: { status: "unknown" },
    redis: { status: "unknown" },
    memory: {
      heapUsedMB: 0,
      heapTotalMB: 0,
      rsseMB: 0,
    },
  };

  let overallStatus: HealthCheck["status"] = "healthy";

  // Check database
  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    checks.database = {
      status: "connected",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    overallStatus = "unhealthy";
  }

  // Check Redis
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      const { default: IORedis } = await import("ioredis");
      const redis = new IORedis(redisUrl, { connectTimeout: 3000, lazyConnect: true });
      await redis.connect();
      await redis.ping();
      checks.redis = { status: "connected" };
      await redis.disconnect();
    } else {
      checks.redis = { status: "not_configured" };
      if (overallStatus === "healthy") overallStatus = "degraded";
    }
  } catch (error) {
    checks.redis = {
      status: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    if (overallStatus === "healthy") overallStatus = "degraded";
  }

  // Memory usage
  if (typeof process !== "undefined" && process.memoryUsage) {
    const mem = process.memoryUsage();
    checks.memory = {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rsseMB: Math.round(mem.rss / 1024 / 1024),
    };
  }

  const health: HealthCheck = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  };

  return NextResponse.json(health, {
    status: overallStatus === "unhealthy" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
