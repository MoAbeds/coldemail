export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withPermission, teamIdFromLead } from "@/lib/security/guards";

// PUT /api/leads/[id]/status — Update lead status
export const PUT = withPermission(
  "manage_own_leads",
  async (req, _ctx, params) => {
    const leadId = params?.id;
    if (!leadId) {
      return NextResponse.json({ error: "Lead ID required" }, { status: 400 });
    }

    const { status } = await req.json();
    const validStatuses = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.lead.update({
      where: { id: leadId },
      data: { status, lastActivityAt: new Date() },
    });

    await db.prospect.update({
      where: { id: lead.prospectId },
      data: { leadStatus: status },
    });

    if (status === "WON" || status === "LOST") {
      await db.prospect.update({
        where: { id: lead.prospectId },
        data: { status: "COMPLETED" },
      });
    }

    return NextResponse.json({ lead: updated });
  },
  {
    resolveTeamId: teamIdFromLead,
    auditAction: "lead.status_changed",
    auditEntity: "Lead",
  }
);
