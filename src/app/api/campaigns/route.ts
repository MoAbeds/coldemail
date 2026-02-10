export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma, CampaignStatus } from "@prisma/client";

// GET /api/campaigns — list campaigns with search, filters, sorting, pagination
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const createdBy = searchParams.get("created_by");
    const sortBy = searchParams.get("sort") || "date";
    const sortOrder = (searchParams.get("order") || "desc") as "asc" | "desc";
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    // Get user's teams
    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const where: Prisma.CampaignWhereInput = {
      OR: [
        { createdById: session.user.id },
        ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
      ],
    };

    // Search by name
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Status filter
    if (status) {
      const statuses = status.split(",");
      if (statuses.length === 1) {
        where.status = status as Prisma.EnumCampaignStatusFilter;
      } else {
        where.status = { in: statuses as CampaignStatus[] };
      }
    }

    // Created by filter
    if (createdBy) {
      where.createdById = createdBy;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Sort
    let orderBy: Prisma.CampaignOrderByWithRelationInput;
    switch (sortBy) {
      case "name":
        orderBy = { name: sortOrder };
        break;
      case "last_activity":
        orderBy = { updatedAt: sortOrder };
        break;
      case "status":
        orderBy = { status: sortOrder };
        break;
      default: // "date"
        orderBy = { createdAt: sortOrder };
    }

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          emailAccount: { select: { email: true, displayName: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { prospects: true, emailEvents: true, leads: true } },
          sequences: {
            select: { id: true, stepNumber: true, type: true },
            orderBy: { stepNumber: "asc" },
          },
        },
      }),
      db.campaign.count({ where }),
    ]);

    // If sorting by performance, compute and sort in memory
    if (sortBy === "performance") {
      const campaignIds = campaigns.map((c) => c.id);
      const replyCounts = await db.emailEvent.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds }, type: "REPLIED" },
        _count: true,
      });
      const replyMap = new Map(replyCounts.map((r) => [r.campaignId, r._count]));

      campaigns.sort((a, b) => {
        const aReplies = replyMap.get(a.id) || 0;
        const bReplies = replyMap.get(b.id) || 0;
        const aRate = a._count.emailEvents > 0 ? aReplies / a._count.emailEvents : 0;
        const bRate = b._count.emailEvents > 0 ? bReplies / b._count.emailEvents : 0;
        return sortOrder === "desc" ? bRate - aRate : aRate - bRate;
      });
    }

    return NextResponse.json({
      campaigns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

// POST /api/campaigns — create campaign with sequence
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      emailAccountId,
      teamId,
      dailyLimit,
      email,
      sequence,
      schedule,
      status,
      startImmediately,
    } = body;

    if (!name || !emailAccountId) {
      return NextResponse.json(
        { error: "Name and email account are required" },
        { status: 400 }
      );
    }

    const account = await db.emailAccount.findFirst({
      where: { id: emailAccountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Email account not found" },
        { status: 404 }
      );
    }

    let resolvedTeamId = teamId;
    if (!resolvedTeamId) {
      const membership = await db.teamMember.findFirst({
        where: { userId: session.user.id },
        select: { teamId: true },
      });
      resolvedTeamId = membership?.teamId;
    }

    if (!resolvedTeamId) {
      return NextResponse.json(
        { error: "No team found. Please create a team first." },
        { status: 400 }
      );
    }

    const campaignStatus =
      status === "DRAFT" ? "DRAFT" : startImmediately ? "ACTIVE" : "DRAFT";

    const campaign = await db.campaign.create({
      data: {
        name,
        teamId: resolvedTeamId,
        emailAccountId,
        createdById: session.user.id,
        status: campaignStatus,
        dailyLimit: dailyLimit || 50,
        sendingSchedule: schedule || null,
        startedAt: campaignStatus === "ACTIVE" ? new Date() : null,
        sequences: {
          create: [
            ...(email
              ? [
                  {
                    stepNumber: 1,
                    type: "EMAIL" as const,
                    subject: email.subject,
                    body: email.body,
                    delayDays: 0,
                    delayHours: 0,
                  },
                ]
              : []),
            ...(sequence || []).map(
              (s: {
                stepNumber: number;
                type: string;
                subject?: string;
                body?: string;
                delayDays?: number;
                delayHours?: number;
                condition?: Record<string, unknown>;
              }) => ({
                stepNumber: s.stepNumber,
                type: s.type as "EMAIL" | "WAIT" | "CONDITION" | "TASK",
                subject: s.subject || null,
                body: s.body || null,
                delayDays: s.delayDays || 0,
                delayHours: s.delayHours || 0,
                condition: s.condition || null,
              })
            ),
          ],
        },
      },
      include: { sequences: true },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
