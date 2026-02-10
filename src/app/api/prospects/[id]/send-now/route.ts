export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailSendQueue } from "@/lib/queue";

// POST /api/prospects/[id]/send-now — Force immediate send for a prospect
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { id: params.id },
      include: {
        campaign: {
          include: {
            sequences: { orderBy: { stepNumber: "asc" } },
            createdBy: { select: { id: true } },
            emailAccount: { select: { id: true } },
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    // Auth check: must be campaign creator
    if (prospect.campaign.createdBy.id !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (prospect.status === "BOUNCED" || prospect.status === "UNSUBSCRIBED") {
      return NextResponse.json(
        { error: `Cannot send to ${prospect.status.toLowerCase()} prospect` },
        { status: 400 }
      );
    }

    // Find the next step to send
    const nextStepNumber = prospect.currentStep + 1;
    const nextStep = prospect.campaign.sequences.find(
      (s) => s.stepNumber >= nextStepNumber && s.type === "EMAIL"
    );

    if (!nextStep) {
      return NextResponse.json(
        { error: "No more email steps in sequence" },
        { status: 400 }
      );
    }

    // Enqueue with no delay (immediate)
    await emailSendQueue.add(
      `force-send-${prospect.id}-${nextStep.stepNumber}`,
      {
        prospectId: prospect.id,
        campaignId: prospect.campaignId,
        sequenceStepId: nextStep.id,
        emailAccountId: prospect.campaign.emailAccount.id,
      },
      { delay: 0, priority: 1 } // high priority
    );

    return NextResponse.json({
      success: true,
      message: `Email queued for immediate send to ${prospect.email}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to queue send" },
      { status: 500 }
    );
  }
}
