export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/campaigns/[id]/funnel — Funnel analysis per sequence step
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaign = await db.campaign.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        createdById: true,
        teamId: true,
        sequences: {
          where: { type: "EMAIL" },
          orderBy: { stepNumber: "asc" },
          select: { id: true, stepNumber: true, subject: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isMember = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: campaign.teamId } },
    });
    if (campaign.createdById !== session.user.id && !isMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // For each email step, get event counts
    const steps = await Promise.all(
      campaign.sequences.map(async (step) => {
        const [sent, opened, clicked, replied, bounced] = await Promise.all([
          db.emailEvent.count({ where: { campaignId: params.id, sequenceId: step.id, type: "SENT" } }),
          db.emailEvent.count({ where: { campaignId: params.id, sequenceId: step.id, type: "OPENED" } }),
          db.emailEvent.count({ where: { campaignId: params.id, sequenceId: step.id, type: "CLICKED" } }),
          db.emailEvent.count({ where: { campaignId: params.id, sequenceId: step.id, type: "REPLIED" } }),
          db.emailEvent.count({ where: { campaignId: params.id, sequenceId: step.id, type: "BOUNCED" } }),
        ]);

        return {
          stepNumber: step.stepNumber,
          subject: step.subject || `Step ${step.stepNumber}`,
          sent,
          opened,
          clicked,
          replied,
          bounced,
          openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
          clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
          replyRate: sent > 0 ? Math.round((replied / sent) * 1000) / 10 : 0,
        };
      })
    );

    return NextResponse.json({ steps });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch funnel data" },
      { status: 500 }
    );
  }
}
