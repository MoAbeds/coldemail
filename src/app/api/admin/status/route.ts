export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withPermission } from "@/lib/security/guards";
import type { TeamContext } from "@/lib/security/guards";

/**
 * GET /api/admin/status — System metrics for the monitoring dashboard.
 * Requires owner permission.
 */
export const GET = withPermission("manage_billing", async (req: Request, ctx: TeamContext) => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Parallel queries for efficiency
  const [
    campaignStats,
    emailsSentToday,
    emailsSentLastHour,
    recentErrors,
    queueHealth,
    accountHealth,
    leadStats,
  ] = await Promise.all([
    // Campaign status counts
    db.campaign.groupBy({
      by: ["status"],
      where: { teamId: ctx.teamId },
      _count: true,
    }),

    // Emails sent in last 24h
    db.emailEvent.count({
      where: {
        type: "SENT",
        timestamp: { gte: oneDayAgo },
        campaign: { teamId: ctx.teamId },
      },
    }),

    // Emails sent in last hour
    db.emailEvent.count({
      where: {
        type: "SENT",
        timestamp: { gte: oneHourAgo },
        campaign: { teamId: ctx.teamId },
      },
    }),

    // Recent bounces and errors
    db.emailEvent.count({
      where: {
        type: "BOUNCED",
        timestamp: { gte: oneDayAgo },
        campaign: { teamId: ctx.teamId },
      },
    }),

    // Queue stats (email accounts with remaining capacity)
    db.emailAccount.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        dailyLimit: true,
        sentToday: true,
        isActive: true,
        lastErrorAt: true,
      },
    }),

    // Email account health
    db.emailAccount.count({
      where: {
        userId: ctx.userId,
        isActive: true,
      },
    }),

    // Lead temperature distribution
    db.lead.groupBy({
      by: ["temperature"],
      where: { campaign: { teamId: ctx.teamId } },
      _count: true,
    }),
  ]);

  // Calculate totals
  const campaignCounts = Object.fromEntries(
    campaignStats.map((s) => [s.status, s._count])
  );
  const leadCounts = Object.fromEntries(
    leadStats.map((s) => [s.temperature, s._count])
  );

  // Email sending rate (per minute, based on last hour)
  const sendingRatePerMin = Math.round((emailsSentLastHour / 60) * 100) / 100;

  // Error rate (bounces + spam / sent)
  const errorRate = emailsSentToday > 0
    ? Math.round((recentErrors / emailsSentToday) * 10000) / 100
    : 0;

  return NextResponse.json({
    overview: {
      activeCampaigns: campaignCounts["ACTIVE"] || 0,
      pausedCampaigns: campaignCounts["PAUSED"] || 0,
      draftCampaigns: campaignCounts["DRAFT"] || 0,
      emailsSentToday,
      emailsSentLastHour,
      sendingRatePerMin,
      errorRate,
      errorsToday: recentErrors,
    },
    emailAccounts: queueHealth.map((a) => ({
      id: a.id,
      email: a.email,
      displayName: a.displayName,
      isActive: a.isActive,
      dailyLimit: a.dailyLimit,
      sentToday: a.sentToday ?? 0,
      remaining: a.dailyLimit - (a.sentToday ?? 0),
      lastErrorAt: a.lastErrorAt,
    })),
    leads: {
      hot: leadCounts["HOT"] || 0,
      warm: leadCounts["WARM"] || 0,
      cold: leadCounts["COLD"] || 0,
    },
    healthyAccounts: accountHealth,
    timestamp: now.toISOString(),
  });
});
