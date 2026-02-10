export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSendQueue } from "@/lib/queue";
import { parseSchedule, calculateNextSendTime, delayFromNow } from "@/lib/scheduling";
import { withPermission, teamIdFromCampaign } from "@/lib/security/guards";

// POST /api/campaigns/[id]/start — Enqueue all prospects for sending
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
        emailAccount: { select: { id: true, isActive: true, isVerified: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "ACTIVE") {
      return NextResponse.json({ error: "Campaign is already active" }, { status: 400 });
    }

    if (!campaign.emailAccount.isActive || !campaign.emailAccount.isVerified) {
      return NextResponse.json({ error: "Email account is not active or verified" }, { status: 400 });
    }

    const firstStep = campaign.sequences.find((s) => s.type === "EMAIL");
    if (!firstStep) {
      return NextResponse.json({ error: "Campaign has no email steps" }, { status: 400 });
    }

    const prospects = await db.prospect.findMany({
      where: { campaignId: campaign.id, status: "PENDING" },
    });

    if (prospects.length === 0) {
      return NextResponse.json({ error: "No prospects to send to" }, { status: 400 });
    }

    await db.campaign.update({
      where: { id: campaign.id },
      data: { status: "ACTIVE", startedAt: new Date() },
    });

    const schedule = parseSchedule(campaign.sendingSchedule);
    const dailyLimit = campaign.dailyLimit;
    let enqueued = 0;

    for (const prospect of prospects) {
      const dayOffset = Math.floor(enqueued / dailyLimit);
      const minuteOffset = (enqueued % dailyLimit) * 2;

      const sendAt = calculateNextSendTime(new Date(), dayOffset, 0, schedule);
      const staggeredTime = new Date(sendAt.getTime() + minuteOffset * 60_000);

      await emailSendQueue.add(
        `send-${prospect.id}-${firstStep.stepNumber}`,
        {
          prospectId: prospect.id,
          campaignId: campaign.id,
          sequenceStepId: firstStep.id,
          emailAccountId: campaign.emailAccount.id,
        },
        { delay: delayFromNow(staggeredTime) }
      );

      await db.prospect.update({
        where: { id: prospect.id },
        data: { nextScheduledAt: staggeredTime },
      });

      enqueued++;
    }

    return NextResponse.json({
      success: true,
      message: `Campaign started. ${enqueued} emails queued.`,
      enqueuedCount: enqueued,
    });
  },
  {
    resolveTeamId: teamIdFromCampaign,
    auditAction: "campaign.started",
    auditEntity: "Campaign",
  }
);
