export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { format } from "date-fns";

// GET /api/campaigns/[id]/export — CSV export of campaign data
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
      select: { id: true, name: true, createdById: true, teamId: true },
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

    // Fetch prospects with their events
    const prospects = await db.prospect.findMany({
      where: { campaignId: params.id },
      include: {
        emailEvents: {
          orderBy: { timestamp: "asc" },
          select: { type: true, timestamp: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Build CSV
    const headers = [
      "Email",
      "First Name",
      "Last Name",
      "Company",
      "Job Title",
      "Status",
      "Current Step",
      "Lead Temperature",
      "Emails Sent",
      "Opens",
      "Clicks",
      "Replied",
      "First Sent At",
      "Last Activity",
    ];

    const rows = prospects.map((p) => {
      const eventCounts = { SENT: 0, OPENED: 0, CLICKED: 0, REPLIED: 0 };
      let firstSent = "";
      let lastActivity = "";

      for (const e of p.emailEvents) {
        if (e.type in eventCounts) {
          eventCounts[e.type as keyof typeof eventCounts]++;
        }
        if (e.type === "SENT" && !firstSent) {
          firstSent = format(e.timestamp, "yyyy-MM-dd HH:mm");
        }
        lastActivity = format(e.timestamp, "yyyy-MM-dd HH:mm");
      }

      return [
        p.email,
        p.firstName || "",
        p.lastName || "",
        p.company || "",
        p.jobTitle || "",
        p.status,
        p.currentStep,
        p.leadTemperature,
        eventCounts.SENT,
        eventCounts.OPENED,
        eventCounts.CLICKED,
        eventCounts.REPLIED,
        firstSent,
        lastActivity,
      ];
    });

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const filename = `${campaign.name.replace(/[^a-zA-Z0-9]/g, "_")}_export_${format(new Date(), "yyyyMMdd")}.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
