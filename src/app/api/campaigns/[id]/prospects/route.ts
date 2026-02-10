export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma, ProspectStatus } from "@prisma/client";

// GET /api/campaigns/[id]/prospects — Search prospects within a campaign
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const step = searchParams.get("step");
    const temperature = searchParams.get("temperature");
    const engagement = searchParams.get("engagement"); // unopened, opened, clicked, replied, bounced
    const sortBy = searchParams.get("sort") || "date";
    const sortOrder = (searchParams.get("order") || "desc") as "asc" | "desc";

    // Verify campaign access
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      select: { createdById: true, teamId: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: campaign.teamId } },
    });

    if (campaign.createdById !== session.user.id && !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const where: Prisma.ProspectWhereInput = { campaignId };

    // Search
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
    }

    // Status filter
    if (status) {
      const statuses = status.split(",");
      if (statuses.length === 1) {
        where.status = status as Prisma.EnumProspectStatusFilter;
      } else {
        where.status = { in: statuses as ProspectStatus[] };
      }
    }

    // Step filter
    if (step) {
      where.currentStep = parseInt(step, 10);
    }

    // Temperature filter
    if (temperature) {
      where.leadTemperature = temperature as Prisma.EnumLeadTemperatureFilter;
    }

    // Engagement filters
    if (engagement === "unopened") {
      where.NOT = { emailEvents: { some: { type: "OPENED" } } };
      where.emailEvents = { some: { type: "SENT" } };
    } else if (engagement === "opened") {
      where.emailEvents = { some: { type: "OPENED" } };
    } else if (engagement === "clicked") {
      where.emailEvents = { some: { type: "CLICKED" } };
    } else if (engagement === "replied") {
      where.emailEvents = { some: { type: "REPLIED" } };
    } else if (engagement === "bounced") {
      where.status = "BOUNCED";
    }

    // Sort
    let orderBy: Prisma.ProspectOrderByWithRelationInput;
    switch (sortBy) {
      case "name":
        orderBy = { firstName: sortOrder };
        break;
      case "email":
        orderBy = { email: sortOrder };
        break;
      case "step":
        orderBy = { currentStep: sortOrder };
        break;
      case "status":
        orderBy = { status: sortOrder };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [prospects, total, statusCounts] = await Promise.all([
      db.prospect.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          jobTitle: true,
          status: true,
          currentStep: true,
          leadTemperature: true,
          leadStatus: true,
          lastEmailSentAt: true,
          createdAt: true,
          _count: {
            select: {
              emailEvents: true,
            },
          },
          emailEvents: {
            orderBy: { timestamp: "desc" },
            take: 1,
            select: { type: true, timestamp: true },
          },
        },
      }),
      db.prospect.count({ where }),
      // Status breakdown for the filter UI
      db.prospect.groupBy({
        by: ["status"],
        where: { campaignId },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      prospects,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      statusCounts: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count])
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch prospects" },
      { status: 500 }
    );
  }
}
