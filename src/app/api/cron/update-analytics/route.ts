export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth, cronUnauthorized } from "@/lib/cron-auth";

/**
 * Cron: Update lead temperatures based on engagement signals.
 * Runs every hour.
 *
 * - Replies in last 24h → HOT
 * - Clicks without reply → WARM
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) return cronUnauthorized();

  try {
    const campaigns = await db.campaign.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      select: { id: true },
    });

    let updatedLeads = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const campaign of campaigns) {
      // Leads with replies in last 24h → HOT
      const hotLeads = await db.lead.updateMany({
        where: {
          campaignId: campaign.id,
          temperature: { not: "HOT" },
          prospect: {
            emailEvents: {
              some: {
                type: "REPLIED",
                timestamp: { gte: oneDayAgo },
              },
            },
          },
        },
        data: { temperature: "HOT", lastActivityAt: new Date() },
      });

      // Leads with clicks but no reply → WARM
      const warmLeads = await db.lead.updateMany({
        where: {
          campaignId: campaign.id,
          temperature: "COLD",
          prospect: {
            emailEvents: {
              some: { type: "CLICKED" },
            },
            NOT: {
              emailEvents: { some: { type: "REPLIED" } },
            },
          },
        },
        data: { temperature: "WARM" },
      });

      updatedLeads += hotLeads.count + warmLeads.count;
    }

    console.log(
      `[cron:update-analytics] Updated ${updatedLeads} leads across ${campaigns.length} campaigns`
    );

    return NextResponse.json({
      ok: true,
      campaignsProcessed: campaigns.length,
      updatedLeads,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron:update-analytics] Error:", error);
    return NextResponse.json({ error: "Failed to update analytics" }, { status: 500 });
  }
}
