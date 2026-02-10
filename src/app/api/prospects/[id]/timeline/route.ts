export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/prospects/[id]/timeline — Prospect engagement timeline
export async function GET(
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
          select: {
            id: true,
            name: true,
            createdById: true,
            teamId: true,
          },
        },
        emailEvents: {
          orderBy: { timestamp: "desc" },
          include: {
            sequence: {
              select: { stepNumber: true, subject: true },
            },
          },
        },
        leads: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            temperature: true,
            createdAt: true,
          },
        },
        tasks: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Auth: campaign creator or team member
    const isMember = await db.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: session.user.id,
          teamId: prospect.campaign.teamId,
        },
      },
    });
    if (prospect.campaign.createdById !== session.user.id && !isMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build unified timeline
    const timeline: Array<{
      type: string;
      timestamp: Date;
      data: Record<string, unknown>;
    }> = [];

    for (const event of prospect.emailEvents) {
      timeline.push({
        type: `email.${event.type.toLowerCase()}`,
        timestamp: event.timestamp,
        data: {
          stepNumber: event.sequence.stepNumber,
          subject: event.sequence.subject,
          eventData: event.eventData,
        },
      });
    }

    for (const lead of prospect.leads) {
      timeline.push({
        type: "lead.created",
        timestamp: lead.createdAt,
        data: {
          status: lead.status,
          temperature: lead.temperature,
        },
      });
    }

    for (const task of prospect.tasks) {
      timeline.push({
        type: `task.${task.status.toLowerCase()}`,
        timestamp: task.completedAt || task.createdAt,
        data: {
          taskType: task.type,
          title: task.title,
          dueDate: task.dueDate,
        },
      });
    }

    // Sort by timestamp descending
    timeline.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      prospect: {
        id: prospect.id,
        email: prospect.email,
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        company: prospect.company,
        jobTitle: prospect.jobTitle,
        status: prospect.status,
        currentStep: prospect.currentStep,
        leadTemperature: prospect.leadTemperature,
        leadStatus: prospect.leadStatus,
      },
      campaign: prospect.campaign,
      timeline,
      summary: {
        totalEvents: prospect.emailEvents.length,
        emailsSent: prospect.emailEvents.filter((e) => e.type === "SENT").length,
        opens: prospect.emailEvents.filter((e) => e.type === "OPENED").length,
        clicks: prospect.emailEvents.filter((e) => e.type === "CLICKED").length,
        replies: prospect.emailEvents.filter((e) => e.type === "REPLIED").length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
