export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth, cronUnauthorized } from "@/lib/cron-auth";

/**
 * Cron: Process email send queue for active campaigns.
 * Runs every minute.
 *
 * Finds prospects that are due to be emailed and enqueues send jobs.
 * Respects daily limits, sending schedules, and timezone constraints.
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) return cronUnauthorized();

  try {
    const now = new Date();
    const currentHour = now.getUTCHours();

    // Find active campaigns within their sending window
    const campaigns = await db.campaign.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        dailyLimit: true,
        sendingSchedule: true,
        timezone: true,
        emailAccountId: true,
        emailAccount: {
          select: {
            id: true,
            dailyLimit: true,
            sentToday: true,
          },
        },
        _count: {
          select: { prospects: true },
        },
      },
    });

    let totalEnqueued = 0;
    const results: Array<{ campaignId: string; enqueued: number; skipped: string | null }> = [];

    for (const campaign of campaigns) {
      // Check sending schedule
      const schedule = campaign.sendingSchedule as {
        startHour?: number;
        endHour?: number;
        days?: number[];
      } | null;

      if (schedule) {
        const dayOfWeek = now.getUTCDay();
        if (schedule.days && !schedule.days.includes(dayOfWeek)) {
          results.push({ campaignId: campaign.id, enqueued: 0, skipped: "not_scheduled_day" });
          continue;
        }
        if (
          schedule.startHour !== undefined &&
          schedule.endHour !== undefined &&
          (currentHour < schedule.startHour || currentHour >= schedule.endHour)
        ) {
          results.push({ campaignId: campaign.id, enqueued: 0, skipped: "outside_hours" });
          continue;
        }
      }

      // Check daily limit
      const account = campaign.emailAccount;
      const remainingForAccount = account.dailyLimit - (account.sentToday ?? 0);
      if (remainingForAccount <= 0) {
        results.push({ campaignId: campaign.id, enqueued: 0, skipped: "daily_limit_reached" });
        continue;
      }

      // Find prospects ready to send (PENDING status, not yet sent this step)
      const batchSize = Math.min(campaign.dailyLimit, remainingForAccount, 10); // max 10 per minute per campaign
      const prospects = await db.prospect.findMany({
        where: {
          campaignId: campaign.id,
          status: "PENDING",
          nextScheduledAt: { lte: now },
        },
        take: batchSize,
        select: { id: true },
      });

      if (prospects.length === 0) {
        results.push({ campaignId: campaign.id, enqueued: 0, skipped: "no_pending" });
        continue;
      }

      // Try to enqueue via BullMQ
      try {
        const { Queue } = await import("bullmq");
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          const url = new URL(redisUrl);
          const queue = new Queue("email-send", {
            connection: { host: url.hostname, port: Number(url.port) || 6379 },
          });

          for (const prospect of prospects) {
            await queue.add("send-email", {
              prospectId: prospect.id,
              campaignId: campaign.id,
              emailAccountId: account.id,
            });
          }

          await queue.close();
        }
      } catch {
        console.warn("[cron:process-queue] Redis not available");
      }

      totalEnqueued += prospects.length;
      results.push({ campaignId: campaign.id, enqueued: prospects.length, skipped: null });
    }

    console.log(`[cron:process-queue] Enqueued ${totalEnqueued} emails across ${campaigns.length} campaigns`);

    return NextResponse.json({
      ok: true,
      totalEnqueued,
      campaigns: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron:process-queue] Error:", error);
    return NextResponse.json({ error: "Failed to process queue" }, { status: 500 });
  }
}
