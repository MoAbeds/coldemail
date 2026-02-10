export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { scheduleReplyChecks } from "@/lib/cron";

// POST /api/cron/reply-check
// Should be called every 15-30 minutes
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await scheduleReplyChecks();
    return NextResponse.json({
      success: true,
      accountsChecked: count,
    });
  } catch {
    return NextResponse.json(
      { error: "Reply check scheduling failed" },
      { status: 500 }
    );
  }
}
