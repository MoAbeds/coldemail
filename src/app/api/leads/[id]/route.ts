export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/leads/[id] — Lead detail with full timeline
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lead = await db.lead.findUnique({
      where: { id: params.id },
      include: {
        prospect: {
          include: {
            emailEvents: {
              orderBy: { timestamp: "desc" },
              include: {
                sequence: {
                  select: { stepNumber: true, subject: true, body: true },
                },
              },
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            createdById: true,
            teamId: true,
            emailAccountId: true,
            emailAccount: {
              select: { id: true, email: true, displayName: true },
            },
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, image: true },
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
    if (lead.campaign.createdById !== session.user.id && !isMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Compute engagement stats
    const events = lead.prospect.emailEvents;
    const stats = {
      sent: events.filter((e) => e.type === "SENT").length,
      opened: events.filter((e) => e.type === "OPENED").length,
      clicked: events.filter((e) => e.type === "CLICKED").length,
      replied: events.filter((e) => e.type === "REPLIED").length,
    };

    return NextResponse.json({ lead, stats });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}
