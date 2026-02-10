export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma, LeadStatus, LeadTemperature } from "@prisma/client";

// GET /api/leads — List leads with filters and pagination
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "newest";
    const sortOrder = (searchParams.get("order") || "desc") as "asc" | "desc";
    const status = searchParams.get("status");
    const temperature = searchParams.get("temperature");
    const campaignId = searchParams.get("campaignId");
    const campaigns = searchParams.get("campaigns"); // comma-separated for multi-select
    const filter = searchParams.get("filter"); // replied, opened, clicked, new_today
    const assignedTo = searchParams.get("assigned_to");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // Advanced filters
    const hasOpened = searchParams.get("has_opened"); // "yes" | "no"
    const hasClicked = searchParams.get("has_clicked"); // "yes" | "no"
    const hasReplied = searchParams.get("has_replied"); // "yes" | "no"
    const minOpens = searchParams.get("min_opens"); // number
    const minClicks = searchParams.get("min_clicks"); // number

    // Base where: user must own the campaign or be a team member
    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const where: Prisma.LeadWhereInput = {
      campaign: {
        OR: [
          { createdById: session.user.id },
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      },
    };

    // Status filter
    if (status) {
      const statuses = status.split(",");
      if (statuses.length === 1) {
        where.status = status as Prisma.EnumLeadStatusFilter;
      } else {
        where.status = { in: statuses as LeadStatus[] };
      }
    }

    // Temperature filter
    if (temperature) {
      const temps = temperature.split(",");
      if (temps.length === 1) {
        where.temperature = temperature as Prisma.EnumLeadTemperatureFilter;
      } else {
        where.temperature = { in: temps as LeadTemperature[] };
      }
    }

    // Campaign filter (single or multi-select)
    if (campaignId) {
      where.campaignId = campaignId;
    } else if (campaigns) {
      where.campaignId = { in: campaigns.split(",") };
    }

    // Assigned to filter
    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    // Date range
    if (dateFrom || dateTo) {
      where.lastActivityAt = {};
      if (dateFrom) where.lastActivityAt.gte = new Date(dateFrom);
      if (dateTo) where.lastActivityAt.lte = new Date(dateTo);
    }

    // Build prospect-level filters
    const prospectWhere: Prisma.ProspectWhereInput = {};
    let hasProspectFilter = false;

    // Event-based filters
    if (filter === "replied") {
      prospectWhere.emailEvents = { some: { type: "REPLIED" } };
      hasProspectFilter = true;
    } else if (filter === "opened") {
      prospectWhere.emailEvents = { some: { type: "OPENED" } };
      prospectWhere.NOT = { emailEvents: { some: { type: "REPLIED" } } };
      hasProspectFilter = true;
    } else if (filter === "clicked") {
      prospectWhere.emailEvents = { some: { type: "CLICKED" } };
      hasProspectFilter = true;
    } else if (filter === "new_today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      where.createdAt = { gte: todayStart };
    }

    // Advanced engagement filters
    if (hasOpened === "yes") {
      prospectWhere.emailEvents = { ...prospectWhere.emailEvents, some: { type: "OPENED" } };
      hasProspectFilter = true;
    } else if (hasOpened === "no") {
      prospectWhere.NOT = { emailEvents: { some: { type: "OPENED" } } };
      hasProspectFilter = true;
    }

    if (hasClicked === "yes") {
      prospectWhere.emailEvents = { ...prospectWhere.emailEvents, some: { type: "CLICKED" } };
      hasProspectFilter = true;
    } else if (hasClicked === "no" && !prospectWhere.NOT) {
      prospectWhere.NOT = { emailEvents: { some: { type: "CLICKED" } } };
      hasProspectFilter = true;
    }

    if (hasReplied === "yes") {
      prospectWhere.emailEvents = { ...prospectWhere.emailEvents, some: { type: "REPLIED" } };
      hasProspectFilter = true;
    } else if (hasReplied === "no" && !prospectWhere.NOT) {
      prospectWhere.NOT = { emailEvents: { some: { type: "REPLIED" } } };
      hasProspectFilter = true;
    }

    // Search
    if (search) {
      prospectWhere.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ];
      hasProspectFilter = true;
    }

    if (hasProspectFilter) {
      where.prospect = prospectWhere;
    }

    // Sort
    let orderBy: Prisma.LeadOrderByWithRelationInput;
    switch (sort) {
      case "last_activity":
        orderBy = { lastActivityAt: { sort: sortOrder, nulls: "last" } };
        break;
      case "hottest":
        orderBy = { temperature: "asc" };
        break;
      case "replied":
        orderBy = { lastActivityAt: { sort: "desc", nulls: "last" } };
        break;
      case "name":
        orderBy = { prospect: { firstName: sortOrder } };
        break;
      default:
        orderBy = { createdAt: sortOrder };
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          prospect: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              company: true,
              jobTitle: true,
              status: true,
              leadTemperature: true,
              currentStep: true,
              emailEvents: {
                orderBy: { timestamp: "desc" },
                take: 1,
                select: { type: true, timestamp: true, eventData: true },
              },
            },
          },
          campaign: {
            select: { id: true, name: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      }),
      db.lead.count({ where }),
    ]);

    // Post-filter for min opens/clicks (requires counting per prospect)
    let filteredLeads = leads;
    if (minOpens || minClicks) {
      const prospectIds = leads.map((l) => l.prospect.id);
      const eventCounts = await db.emailEvent.groupBy({
        by: ["prospectId", "type"],
        where: {
          prospectId: { in: prospectIds },
          type: { in: ["OPENED", "CLICKED"] },
        },
        _count: true,
      });

      const openCounts = new Map<string, number>();
      const clickCounts = new Map<string, number>();
      for (const ec of eventCounts) {
        if (ec.type === "OPENED") openCounts.set(ec.prospectId, ec._count);
        if (ec.type === "CLICKED") clickCounts.set(ec.prospectId, ec._count);
      }

      filteredLeads = leads.filter((l) => {
        if (minOpens && (openCounts.get(l.prospect.id) || 0) < parseInt(minOpens, 10)) return false;
        if (minClicks && (clickCounts.get(l.prospect.id) || 0) < parseInt(minClicks, 10)) return false;
        return true;
      });
    }

    return NextResponse.json({
      leads: filteredLeads,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
