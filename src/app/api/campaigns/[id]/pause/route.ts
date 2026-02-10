export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSendQueue } from "@/lib/queue";
import { withPermission, teamIdFromCampaign } from "@/lib/security/guards";

// POST /api/campaigns/[id]/pause — Pause campaign and remove pending jobs
export const POST = withPermission(
  "edit_own_campaign",
  async (_req, ctx, params) => {
    const campaignId = params?.id;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, teamId: ctx.teamId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "ACTIVE") {
      return NextResponse.json({ error: "Campaign is not active" }, { status: 400 });
    }

    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: "PAUSED", pausedAt: new Date() },
    });

    await db.prospect.updateMany({
      where: { campaignId: campaign.id, status: "SENDING" },
      data: { status: "PAUSED" },
    });

    const delayed = await emailSendQueue.getDelayed();
    const waiting = await emailSendQueue.getWaiting();
    const allJobs = [...delayed, ...waiting];

    let removedCount = 0;
    for (const job of allJobs) {
      if (job.data && job.data.campaignId === campaign.id) {
        await job.remove();
        removedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Campaign paused. ${removedCount} queued jobs removed.`,
      removedCount,
    });
  },
  {
    resolveTeamId: teamIdFromCampaign,
    auditAction: "campaign.paused",
    auditEntity: "Campaign",
  }
);
