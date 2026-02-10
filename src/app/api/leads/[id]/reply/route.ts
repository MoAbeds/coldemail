export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProvider } from "@/lib/providers";

// POST /api/leads/[id]/reply — Send reply to a lead
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, body } = await req.json();
    if (!body || body.trim().length === 0) {
      return NextResponse.json(
        { error: "Reply body is required" },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id: params.id },
      include: {
        prospect: true,
        campaign: {
          include: {
            emailAccount: true,
            createdBy: { select: { id: true } },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Auth check
    const isMember = await db.teamMember.findUnique({
      where: {
        userId_teamId: { userId: session.user.id, teamId: lead.campaign.teamId },
      },
    });
    if (lead.campaign.createdBy.id !== session.user.id && !isMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Find the last SENT event for threading
    const lastSentEvent = await db.emailEvent.findFirst({
      where: {
        prospectId: lead.prospectId,
        campaignId: lead.campaignId,
        type: "SENT",
      },
      orderBy: { timestamp: "desc" },
      select: { messageId: true, sequenceId: true },
    });

    const account = lead.campaign.emailAccount;
    const provider = createProvider(account);

    // Build reply subject
    const replySubject =
      subject || `Re: ${lastSentEvent ? "your previous email" : "Follow up"}`;

    // Build HTML body
    const htmlBody = `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6;">${body.replace(/\n/g, "<br>")}</div>`;

    // Thread headers
    const headers: Record<string, string> = {};
    if (lastSentEvent?.messageId) {
      headers["In-Reply-To"] = lastSentEvent.messageId;
      headers["References"] = lastSentEvent.messageId;
    }

    const result = await provider.send({
      to: lead.prospect.email,
      from: account.email,
      fromName: account.displayName,
      subject: replySubject,
      htmlBody,
      textBody: body,
      headers,
      inReplyTo: lastSentEvent?.messageId || undefined,
      references: lastSentEvent?.messageId || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send reply" },
        { status: 500 }
      );
    }

    // Get first sequence for the event record
    const firstSequence = await db.emailSequence.findFirst({
      where: { campaignId: lead.campaignId },
      orderBy: { stepNumber: "asc" },
    });

    // Record the reply as an event
    await db.emailEvent.create({
      data: {
        prospectId: lead.prospectId,
        campaignId: lead.campaignId,
        sequenceId: lastSentEvent?.sequenceId || firstSequence?.id || "",
        emailAccountId: account.id,
        type: "SENT",
        messageId: result.messageId,
        eventData: { isManualReply: true, subject: replySubject },
      },
    });

    // Update lead
    await db.lead.update({
      where: { id: lead.id },
      data: {
        status: "CONTACTED",
        lastActivityAt: new Date(),
      },
    });

    // Update prospect
    await db.prospect.update({
      where: { id: lead.prospectId },
      data: {
        leadStatus: "CONTACTED",
        lastEmailSentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }
}
