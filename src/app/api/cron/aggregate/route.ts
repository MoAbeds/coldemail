export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/cron/aggregate — Aggregate analytics data
// Run daily to pre-compute metrics for faster dashboard loads
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Update prospect lead temperatures based on engagement
    const prospects = await db.prospect.findMany({
      where: { status: { in: ["SENDING", "PENDING"] } },
      select: { id: true },
    });

    let hotCount = 0;
    let warmCount = 0;

    for (const prospect of prospects) {
      const events = await db.emailEvent.groupBy({
        by: ["type"],
        where: { prospectId: prospect.id },
        _count: true,
      });

      const counts = Object.fromEntries(
        events.map((e) => [e.type, e._count])
      );

      let temp: "HOT" | "WARM" | "COLD" = "COLD";
      if ((counts.REPLIED || 0) > 0 || (counts.CLICKED || 0) >= 2) {
        temp = "HOT";
        hotCount++;
      } else if ((counts.OPENED || 0) >= 2 || (counts.CLICKED || 0) > 0) {
        temp = "WARM";
        warmCount++;
      }

      await db.prospect.update({
        where: { id: prospect.id },
        data: { leadTemperature: temp },
      });
    }

    // Update email account health scores
    const accounts = await db.emailAccount.findMany({
      where: { isActive: true },
      select: { id: true, bounceCount: true, spamCount: true, errorCount: true },
    });

    for (const account of accounts) {
      // Health = 100 - (bounces * 5) - (spam * 10) - (errors * 2), min 0
      const score = Math.max(
        0,
        100 -
          account.bounceCount * 5 -
          account.spamCount * 10 -
          account.errorCount * 2
      );

      await db.emailAccount.update({
        where: { id: account.id },
        data: { healthScore: score },
      });
    }

    return NextResponse.json({
      success: true,
      results: {
        prospectsScored: prospects.length,
        hotLeads: hotCount,
        warmLeads: warmCount,
        accountsScored: accounts.length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 }
    );
  }
}
