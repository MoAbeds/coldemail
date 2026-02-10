export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/leads/bulk-action — Perform bulk operations on leads
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { leadIds, action, data } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const validActions = ["assign", "status", "temperature", "export"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify ownership of all leads
    const leads = await db.lead.findMany({
      where: { id: { in: leadIds } },
      include: {
        campaign: { select: { name: true, createdById: true, teamId: true } },
        prospect: { select: { id: true, email: true, firstName: true, lastName: true, company: true } },
      },
    });

    if (leads.length !== leadIds.length) {
      return NextResponse.json(
        { error: "Some leads not found" },
        { status: 404 }
      );
    }

    // Auth: check each lead
    for (const lead of leads) {
      if (lead.campaign.createdById !== session.user.id) {
        const isMember = await db.teamMember.findUnique({
          where: {
            userId_teamId: {
              userId: session.user.id,
              teamId: lead.campaign.teamId,
            },
          },
        });
        if (!isMember) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
      }
    }

    let affected = 0;

    switch (action) {
      case "assign": {
        if (!data?.userId) {
          return NextResponse.json(
            { error: "userId is required for assign action" },
            { status: 400 }
          );
        }
        const result = await db.lead.updateMany({
          where: { id: { in: leadIds } },
          data: { assignedToId: data.userId, lastActivityAt: new Date() },
        });
        affected = result.count;
        break;
      }

      case "status": {
        const validStatuses = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];
        if (!validStatuses.includes(data?.status)) {
          return NextResponse.json(
            { error: "Valid status is required" },
            { status: 400 }
          );
        }
        const result = await db.lead.updateMany({
          where: { id: { in: leadIds } },
          data: { status: data.status, lastActivityAt: new Date() },
        });
        // Sync prospect status
        const prospectIds = leads.map((l) => l.prospect.id);
        await db.prospect.updateMany({
          where: { id: { in: prospectIds } },
          data: { leadStatus: data.status },
        });
        if (data.status === "WON" || data.status === "LOST") {
          await db.prospect.updateMany({
            where: { id: { in: prospectIds } },
            data: { status: "COMPLETED" },
          });
        }
        affected = result.count;
        break;
      }

      case "temperature": {
        const valid = ["HOT", "WARM", "COLD"];
        if (!valid.includes(data?.temperature)) {
          return NextResponse.json(
            { error: "Valid temperature is required" },
            { status: 400 }
          );
        }
        const result = await db.lead.updateMany({
          where: { id: { in: leadIds } },
          data: { temperature: data.temperature, lastActivityAt: new Date() },
        });
        const prospectIds = leads.map((l) => l.prospect.id);
        await db.prospect.updateMany({
          where: { id: { in: prospectIds } },
          data: { leadTemperature: data.temperature },
        });
        affected = result.count;
        break;
      }

      case "export": {
        // Return CSV data for selected leads
        const headers = ["Email", "First Name", "Last Name", "Company", "Status", "Temperature", "Campaign"];
        const rows = leads.map((l) => [
          l.prospect.email,
          l.prospect.firstName || "",
          l.prospect.lastName || "",
          l.prospect.company || "",
          l.status,
          l.temperature,
          l.campaign.name,
        ]);

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

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="leads_export.csv"`,
          },
        });
      }
    }

    return NextResponse.json({ success: true, affected });
  } catch {
    return NextResponse.json(
      { error: "Bulk action failed" },
      { status: 500 }
    );
  }
}
