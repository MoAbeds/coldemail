export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { subDays, startOfDay, format } from "date-fns";

// GET /api/campaigns/[id]/analytics — Campaign metrics with trends
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const campaign = await db.campaign.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        status: true,
        createdById: true,
        teamId: true,
        startedAt: true,
        createdAt: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Auth: must be campaign creator or team member
    const isMember = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: campaign.teamId } },
    });
    if (campaign.createdById !== session.user.id && !isMember) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const since = startOfDay(subDays(new Date(), days));
    const prevSince = startOfDay(subDays(new Date(), days * 2));

    // Current period counts
    const [sent, opened, clicked, replied, bounced, unsubscribed] =
      await Promise.all([
        db.emailEvent.count({ where: { campaignId: params.id, type: "SENT", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "OPENED", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "CLICKED", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "REPLIED", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "BOUNCED", timestamp: { gte: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "UNSUBSCRIBED", timestamp: { gte: since } } }),
      ]);

    // Previous period counts (for trend calculation)
    const [prevSent, prevOpened, prevClicked, prevReplied] =
      await Promise.all([
        db.emailEvent.count({ where: { campaignId: params.id, type: "SENT", timestamp: { gte: prevSince, lt: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "OPENED", timestamp: { gte: prevSince, lt: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "CLICKED", timestamp: { gte: prevSince, lt: since } } }),
        db.emailEvent.count({ where: { campaignId: params.id, type: "REPLIED", timestamp: { gte: prevSince, lt: since } } }),
      ]);

    // Prospect status breakdown
    const prospectStatuses = await db.prospect.groupBy({
      by: ["status"],
      where: { campaignId: params.id },
      _count: true,
    });

    const totalProspects = prospectStatuses.reduce((sum, s) => sum + s._count, 0);

    // Daily event timeline for charts
    const events = await db.emailEvent.findMany({
      where: { campaignId: params.id, timestamp: { gte: since } },
      select: { type: true, timestamp: true },
      orderBy: { timestamp: "asc" },
    });

    const dailyMap = new Map<string, Record<string, number>>();
    for (let i = 0; i < days; i++) {
      const day = format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd");
      dailyMap.set(day, { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 });
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

    // Calculate rates
    const openRate = sent > 0 ? (opened / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicked / sent) * 100 : 0;
    const replyRate = sent > 0 ? (replied / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;

    // Trends (percentage change)
    const calcTrend = (curr: number, prev: number) =>
      prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        startedAt: campaign.startedAt,
      },
      metrics: {
        sent,
        opened,
        clicked,
        replied,
        bounced,
        unsubscribed,
        openRate: Math.round(openRate * 10) / 10,
        clickRate: Math.round(clickRate * 10) / 10,
        replyRate: Math.round(replyRate * 10) / 10,
        bounceRate: Math.round(bounceRate * 10) / 10,
      },
      trends: {
        sent: Math.round(calcTrend(sent, prevSent)),
        opened: Math.round(calcTrend(opened, prevOpened)),
        clicked: Math.round(calcTrend(clicked, prevClicked)),
        replied: Math.round(calcTrend(replied, prevReplied)),
      },
      prospectStatuses: Object.fromEntries(
        prospectStatuses.map((s) => [s.status, s._count])
      ),
      totalProspects,
      dailyTimeline,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
