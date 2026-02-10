export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  resetDailySentCounters,
  markCompletedCampaigns,
  pauseUnhealthyAccounts,
} from "@/lib/cron";

// POST /api/cron/daily-reset
// Trigger via Vercel cron, external scheduler, or manually
// Protect with a secret in production
export async function POST(req: Request) {
  // Simple auth check for cron endpoints
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [resetCount, completedCount, pausedCount] = await Promise.all([
      resetDailySentCounters(),
      markCompletedCampaigns(),
      pauseUnhealthyAccounts(),
    ]);

    return NextResponse.json({
      success: true,
      results: {
        accountsReset: resetCount,
        campaignsCompleted: completedCount,
        accountsPaused: pausedCount,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Cron job failed" },
      { status: 500 }
    );
  }
}
