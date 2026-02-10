export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/search?q=query&type=all|campaigns|leads|prospects|templates
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "all";
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    if (!q || q.length < 2) {
      return NextResponse.json({ results: {} });
    }

    // Get user's team IDs for scoping
    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const results: Record<string, unknown[]> = {};

    // Campaigns
    if (type === "all" || type === "campaigns") {
      const campaigns = await db.campaign.findMany({
        where: {
          OR: [
            { createdById: session.user.id },
            ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
          ],
          name: { contains: q, mode: "insensitive" as const },
        },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          _count: { select: { prospects: true } },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });
      results.campaigns = campaigns;
    }

    // Prospects (search by name, email, company)
    if (type === "all" || type === "prospects") {
      const prospects = await db.prospect.findMany({
        where: {
          campaign: {
            OR: [
              { createdById: session.user.id },
              ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
            ],
          },
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          company: true,
          status: true,
          leadTemperature: true,
          campaignId: true,
          campaign: { select: { name: true } },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });
      results.prospects = prospects;
    }

    // Leads
    if (type === "all" || type === "leads") {
      const leads = await db.lead.findMany({
        where: {
          campaign: {
            OR: [
              { createdById: session.user.id },
              ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
            ],
          },
          prospect: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          },
        },
        select: {
          id: true,
          status: true,
          temperature: true,
          prospect: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          campaign: { select: { id: true, name: true } },
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });
      results.leads = leads;
    }

    // Templates
    if (type === "all" || type === "templates") {
      const templates = await db.emailTemplate.findMany({
        where: {
          AND: [
            {
              OR: [
                { createdById: session.user.id },
                ...(teamIds.length > 0
                  ? [{ teamId: { in: teamIds }, isShared: true }]
                  : []),
              ],
            },
            {
              OR: [
                { name: { contains: q, mode: "insensitive" as const } },
                { subject: { contains: q, mode: "insensitive" as const } },
              ],
            },
          ],
        },
        select: {
          id: true,
          name: true,
          subject: true,
          category: true,
          usageCount: true,
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });
      results.templates = templates;
    }

    // Team members
    if (type === "all" || type === "members") {
      if (teamIds.length > 0) {
        const members = await db.teamMember.findMany({
          where: {
            teamId: { in: teamIds },
            user: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
          },
          select: {
            role: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          take: limit,
        });
        results.members = members;
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
