export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth, cronUnauthorized } from "@/lib/cron-auth";

/**
 * Cron: Reset daily email send limits for all email accounts.
 * Runs at midnight UTC daily.
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) return cronUnauthorized();

  try {
    const result = await db.emailAccount.updateMany({
      data: { sentToday: 0 },
    });

    console.log(`[cron:reset-daily-limits] Reset ${result.count} email accounts`);

    return NextResponse.json({
      ok: true,
      reset: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron:reset-daily-limits] Error:", error);
    return NextResponse.json({ error: "Failed to reset daily limits" }, { status: 500 });
  }
}
