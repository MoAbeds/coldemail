export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSendQueue } from "@/lib/queue";
import { parseSchedule, calculateNextSendTime, delayFromNow } from "@/lib/scheduling";
import { withPermission, teamIdFromCampaign } from "@/lib/security/guards";

// POST /api/campaigns/[id]/resume — Re-enqueue paused prospects
export const POST = withPermission(
  "edit_own_campaign",
  async (_req, ctx, params) => {
    const campaignId = params?.id;
    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, teamId: ctx.teamId },
      include: {
        sequences: { orderBy: { stepNumber: "asc" } },
        emailAccount: { select: { id: true, isActive: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "PAUSED") {
      return NextResponse.json({ error: "Campaign is not paused" }, { status: 400 });
    }

    const prospects = await db.prospect.findMany({
      where: { campaignId: campaign.id, status: "PAUSED" },
    });

    if (prospects.length === 0) {
      await db.campaign.update({
        where: { id: campaign.id },
        data: { status: "ACTIVE", pausedAt: null },
      });
      return NextResponse.json({
        success: true,
        message: "Campaign resumed. No pending prospects to re-enqueue.",
        enqueuedCount: 0,
      });
    }

    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: "ACTIVE", pausedAt: null },
    });

    const schedule = parseSchedule(campaign.sendingSchedule);
    let enqueued = 0;

    for (const prospect of prospects) {
      const nextStepNumber = prospect.currentStep + 1;
      const nextStep = campaign.sequences.find(
        (s) => s.stepNumber >= nextStepNumber && s.type === "EMAIL"
      );

      if (!nextStep) {
        await db.prospect.update({
          where: { id: prospect.id },
          data: { status: "COMPLETED" },
        });
        continue;
      }

      const sendAt = calculateNextSendTime(new Date(), 0, 0, schedule);
      const staggeredTime = new Date(sendAt.getTime() + enqueued * 2 * 60_000);

      await emailSendQueue.add(
        `send-${prospect.id}-${nextStep.stepNumber}`,
        {
          prospectId: prospect.id,
          campaignId: campaign.id,
          sequenceStepId: nextStep.id,
          emailAccountId: campaign.emailAccount.id,
        },
        { delay: delayFromNow(staggeredTime) }
      );

      await db.prospect.update({
        where: { id: prospect.id },
        data: { status: "SENDING", nextScheduledAt: staggeredTime },
      });

      enqueued++;
    }

    return NextResponse.json({
      success: true,
      message: `Campaign resumed. ${enqueued} emails re-queued.`,
      enqueuedCount: enqueued,
    });
  },
  {
    resolveTeamId: teamIdFromCampaign,
    auditAction: "campaign.resumed",
    auditEntity: "Campaign",
  }
);
