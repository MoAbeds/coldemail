export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withPermission, teamIdFromLead } from "@/lib/security/guards";

// PUT /api/leads/[id]/assign — Assign lead to a user
export const PUT = withPermission(
  "manage_all_leads",
  async (req, ctx, params) => {
    const leadId = params?.id;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    const { userId } = await req.json();

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: { campaign: { select: { teamId: true } } },
    });

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify assignee is team member
    if (userId) {
      const assigneeMember = await db.teamMember.findUnique({
        where: {
          userId_teamId: { userId, teamId: ctx.teamId },
        },
      });
      if (!assigneeMember) {
        return NextResponse.json(
          { error: "Assignee must be a team member" },
          { status: 400 }
        );
      }
    }

    const updated = await db.lead.update({
      where: { id: leadId },
      data: {
        assignedToId: userId || null,
        lastActivityAt: new Date(),
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ lead: updated });
  },
  {
    resolveTeamId: teamIdFromLead,
    auditAction: "lead.assigned",
    auditEntity: "Lead",
  }
);
