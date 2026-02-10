export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

// GET /api/dashboard/stats — Team overview dashboard stats
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const since = startOfDay(subDays(new Date(), days));

    // Get user's teams
    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    // Get user's campaigns (own + team campaigns)
    const campaigns = await db.campaign.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
        ],
      },
      select: { id: true, name: true, status: true, startedAt: true },
    });

    const campaignIds = campaigns.map((c) => c.id);

    if (campaignIds.length === 0) {
      return NextResponse.json({
        overview: { totalCampaigns: 0, activeCampaigns: 0, totalProspects: 0, totalSent: 0, totalOpened: 0, totalReplied: 0, openRate: 0, replyRate: 0 },
        dailyTimeline: [],
        topCampaigns: [],
        teamMembers: [],
      });
    }

    // Overview metrics
    const [totalProspects, totalSent, totalOpened, totalClicked, totalReplied] =
      await Promise.all([
        db.prospect.count({ where: { campaignId: { in: campaignIds } } }),
        db.emailEvent.count({ where: { campaignId: { in: campaignIds }, type: "SENT", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: { in: campaignIds }, type: "OPENED", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: { in: campaignIds }, type: "CLICKED", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: { in: campaignIds }, type: "REPLIED", timestamp: { gte: since } } }),
      ]);

    // Daily timeline
    const events = await db.emailEvent.findMany({
      where: { campaignId: { in: campaignIds }, timestamp: { gte: since } },
      select: { type: true, timestamp: true },
      orderBy: { timestamp: "asc" },
    });

    const dailyMap = new Map<string, Record<string, number>>();
    for (let i = 0; i < days; i++) {
      const day = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
      dailyMap.set(day, { sent: 0, opened: 0, clicked: 0, replied: 0 });
    }
    for (const e of events) {
      const day = format(e.timestamp, "yyyy-MM-dd");
      const bucket = dailyMap.get(day);
      if (bucket) {
        const key = e.type.toLowerCase();
        bucket[key] = (bucket[key] || 0) + 1;
      }
    }
    const dailyTimeline = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Top campaigns by reply rate
    const topCampaigns = await Promise.all(
      campaigns
        .filter((c) => c.status === "ACTIVE" || c.status === "COMPLETED")
        .slice(0, 5)
        .map(async (c) => {
          const [cSent, cOpened, cReplied] = await Promise.all([
            db.emailEvent.count({ where: { campaignId: c.id, type: "SENT" } }),
            db.emailEvent.count({ where: { campaignId: c.id, type: "OPENED" } }),
            db.emailEvent.count({ where: { campaignId: c.id, type: "REPLIED" } }),
          ]);
          return {
            id: c.id,
            name: c.name,
            status: c.status,
            sent: cSent,
            openRate: cSent > 0 ? Math.round((cOpened / cSent) * 1000) / 10 : 0,
            replyRate: cSent > 0 ? Math.round((cReplied / cSent) * 1000) / 10 : 0,
          };
        })
    );

    // Team member stats
    const teamMembers = await Promise.all(
      teamIds.length > 0
        ? (
            await db.teamMember.findMany({
              where: { teamId: { in: teamIds } },
              include: { user: { select: { id: true, name: true, email: true, image: true } } },
            })
          ).map(async (m) => {
            const memberCampaigns = campaigns.filter(
              (c) => c.id // all visible campaigns for now
            );
            const memberCampaignIds = memberCampaigns.map((c) => c.id);
            const [mSent, mReplied] = await Promise.all([
              db.emailEvent.count({
                where: {
                  campaignId: { in: memberCampaignIds },
                  type: "SENT",
                  timestamp: { gte: since },
                  campaign: { createdById: m.user.id },
                },
              }),
              db.emailEvent.count({
                where: {
                  campaignId: { in: memberCampaignIds },
                  type: "REPLIED",
                  timestamp: { gte: since },
                  campaign: { createdById: m.user.id },
                },
              }),
            ]);
            return {
              id: m.user.id,
              name: m.user.name || m.user.email,
              image: m.user.image,
              role: m.role,
              sent: mSent,
              replied: mReplied,
              replyRate: mSent > 0 ? Math.round((mReplied / mSent) * 1000) / 10 : 0,
            };
          })
        : []
    );

    return NextResponse.json({
      overview: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => c.status === "ACTIVE").length,
        totalProspects,
        totalSent,
        totalOpened,
        totalClicked,
        totalReplied,
        openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 1000) / 10 : 0,
        replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 1000) / 10 : 0,
      },
      dailyTimeline,
      topCampaigns: topCampaigns.sort((a, b) => b.replyRate - a.replyRate),
      teamMembers: teamMembers.sort((a, b) => b.sent - a.sent),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
