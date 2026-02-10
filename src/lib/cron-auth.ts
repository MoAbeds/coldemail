import { NextResponse } from "next/server";

/**
 * Validate cron request authorization.
 * Vercel cron jobs send the CRON_SECRET as Authorization header.
 * For local testing, pass ?secret=<CRON_SECRET> as query param.
 */
export function verifyCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In development without CRON_SECRET, allow all
    return process.env.NODE_ENV !== "production";
  }

  // Check Vercel cron header
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // Check query param fallback (for local testing)
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) return true;

  return false;
}

export function cronUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
