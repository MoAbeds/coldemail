export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// GET /api/leads/counts — Filter counts for sidebar badges
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const base: Prisma.LeadWhereInput = {
      campaign: {
        OR: [
          { createdById: session.user.id },
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      },
    };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      all,
      replied,
      openedOnly,
      clicked,
      newToday,
      hot,
      warm,
      cold,
      statusNew,
      statusContacted,
      statusQualified,
      statusWon,
      statusLost,
    ] = await Promise.all([
      db.lead.count({ where: base }),
      db.lead.count({
        where: { ...base, prospect: { emailEvents: { some: { type: "REPLIED" } } } },
      }),
      db.lead.count({
        where: {
          ...base,
          prospect: {
            emailEvents: { some: { type: "OPENED" } },
            NOT: { emailEvents: { some: { type: "REPLIED" } } },
          },
        },
      }),
      db.lead.count({
        where: { ...base, prospect: { emailEvents: { some: { type: "CLICKED" } } } },
      }),
      db.lead.count({ where: { ...base, createdAt: { gte: todayStart } } }),
      db.lead.count({ where: { ...base, temperature: "HOT" } }),
      db.lead.count({ where: { ...base, temperature: "WARM" } }),
      db.lead.count({ where: { ...base, temperature: "COLD" } }),
      db.lead.count({ where: { ...base, status: "NEW" } }),
      db.lead.count({ where: { ...base, status: "CONTACTED" } }),
      db.lead.count({ where: { ...base, status: "QUALIFIED" } }),
      db.lead.count({ where: { ...base, status: "WON" } }),
      db.lead.count({ where: { ...base, status: "LOST" } }),
    ]);

    // Campaign breakdown
    const campaigns = await db.campaign.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
        leads: { some: {} },
      },
      select: {
        id: true,
        name: true,
        _count: { select: { leads: true } },
      },
    });

    return NextResponse.json({
      filters: { all, replied, openedOnly, clicked, newToday },
      temperature: { hot, warm, cold },
      status: {
        NEW: statusNew,
        CONTACTED: statusContacted,
        QUALIFIED: statusQualified,
        WON: statusWon,
        LOST: statusLost,
      },
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.leads,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 }
    );
  }
}
