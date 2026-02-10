import { db } from "@/lib/db";
import { replyCheckQueue } from "@/lib/queue";

/**
 * Daily cron jobs. Run via external scheduler (e.g., Vercel cron, node-cron, or BullMQ repeatable).
 */

/**
 * Reset daily sent counters for all email accounts.
 * Should run at midnight UTC.
 */
export async function resetDailySentCounters(): Promise<number> {
  const result = await db.emailAccount.updateMany({
    where: { sentToday: { gt: 0 } },
    data: { sentToday: 0 },
  });
  console.log(
    `[cron] Reset daily sent counters for ${result.count} accounts`
  );
  return result.count;
}

/**
 * Mark completed campaigns.
 * A campaign is complete when all prospects are in a terminal state.
 */
export async function markCompletedCampaigns(): Promise<number> {
  const activeCampaigns = await db.campaign.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      _count: {
        select: {
          prospects: {
            where: {
              status: { in: ["PENDING", "SENDING"] },
            },
          },
        },
      },
    },
  });

  let completed = 0;
  for (const campaign of activeCampaigns) {
    if (campaign._count.prospects === 0) {
      await db.campaign.update({
        where: { id: campaign.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      completed++;
    }
  }

  if (completed > 0) {
    console.log(`[cron] Marked ${completed} campaigns as completed`);
  }
  return completed;
}

/**
 * Schedule reply checks for all active email accounts.
 * Should run every 15-30 minutes.
 */
export async function scheduleReplyChecks(): Promise<number> {
  const accounts = await db.emailAccount.findMany({
    where: { isActive: true, isVerified: true },
    select: { id: true, userId: true },
  });

  for (const account of accounts) {
    await replyCheckQueue.add(
      `reply-check-${account.id}`,
      {
        emailAccountId: account.id,
        userId: account.userId,
      },
      {
        // Deduplicate: only one check per account at a time
        jobId: `reply-check-${account.id}`,
      }
    );
  }

  console.log(
    `[cron] Scheduled reply checks for ${accounts.length} accounts`
  );
  return accounts.length;
}

/**
 * Auto-pause accounts with poor health.
 * Pauses accounts with health score below 20 or bounce rate > 10%.
 */
export async function pauseUnhealthyAccounts(): Promise<number> {
  const unhealthy = await db.emailAccount.findMany({
    where: {
      isActive: true,
      OR: [
        { healthScore: { lt: 20 } },
        // Bounce rate > 10% (rough: bounceCount > sentToday * 0.1, using errorCount as proxy)
        { errorCount: { gt: 10 } },
      ],
    },
  });

  for (const account of unhealthy) {
    await db.emailAccount.update({
      where: { id: account.id },
      data: {
        isActive: false,
        lastError: "Auto-paused due to poor health score",
        lastErrorAt: new Date(),
      },
    });
  }

  if (unhealthy.length > 0) {
    console.log(
      `[cron] Auto-paused ${unhealthy.length} unhealthy accounts`
    );
  }
  return unhealthy.length;
}
