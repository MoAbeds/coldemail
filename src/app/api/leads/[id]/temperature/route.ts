export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/leads/[id]/temperature — Update lead temperature
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { temperature } = await req.json();
    const valid = ["HOT", "WARM", "COLD"];
    if (!valid.includes(temperature)) {
      return NextResponse.json(
        { error: `Invalid temperature. Must be one of: ${valid.join(", ")}` },
        { status: 400 }
      );
    }

    const lead = await db.lead.findUnique({
      where: { id: params.id },
      include: {
        campaign: { select: { createdById: true, teamId: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isMember = await db.teamMember.findUnique({
      where: {
        userId_teamId: { userId: session.user.id, teamId: lead.campaign.teamId },
      },
    });
    if (lead.campaign.createdById !== session.user.id && !isMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await db.lead.update({
      where: { id: params.id },
      data: { temperature, lastActivityAt: new Date() },
    });

    // Sync to prospect
    await db.prospect.update({
      where: { id: lead.prospectId },
      data: { leadTemperature: temperature },
    });

    return NextResponse.json({ lead: updated });
  } catch {
    return NextResponse.json(
      { error: "Failed to update temperature" },
      { status: 500 }
    );
  }
}
