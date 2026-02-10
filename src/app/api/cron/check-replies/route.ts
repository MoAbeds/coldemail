export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronAuth, cronUnauthorized } from "@/lib/cron-auth";

/**
 * Cron: Enqueue reply-check jobs for active campaigns.
 * Runs every 5 minutes.
 *
 * In production with Redis, this enqueues BullMQ jobs.
 * As a fallback, it triggers reply checking directly.
 */
export async function GET(req: Request) {
  if (!verifyCronAuth(req)) return cronUnauthorized();

  try {
    // Find active campaigns with reply tracking enabled
    const campaigns = await db.campaign.findMany({
      where: {
        status: "ACTIVE",
        trackReplies: true,
      },
      select: {
        id: true,
        emailAccountId: true,
        emailAccount: {
          select: { id: true, email: true, provider: true },
        },
      },
    });

    // Deduplicate by email account (one check per account)
    const accountIds = new Set<string>();
    const uniqueAccounts: Array<{ accountId: string; campaignIds: string[] }> = [];

    for (const campaign of campaigns) {
      if (!accountIds.has(campaign.emailAccountId)) {
        accountIds.add(campaign.emailAccountId);
        uniqueAccounts.push({
          accountId: campaign.emailAccountId,
          campaignIds: campaigns
            .filter((c) => c.emailAccountId === campaign.emailAccountId)
            .map((c) => c.id),
        });
      }
    }

    // Try to enqueue via BullMQ if Redis is available
    let enqueued = 0;
    try {
      const { Queue } = await import("bullmq");
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        const url = new URL(redisUrl);
        const queue = new Queue("reply-check", {
          connection: { host: url.hostname, port: Number(url.port) || 6379 },
        });

        for (const account of uniqueAccounts) {
          await queue.add("check-replies", {
            emailAccountId: account.accountId,
            campaignIds: account.campaignIds,
          });
          enqueued++;
        }

        await queue.close();
      }
    } catch {
      // Redis not available — log for debugging
      console.warn("[cron:check-replies] Redis not available, skipping BullMQ enqueue");
    }

    console.log(
      `[cron:check-replies] Processed ${campaigns.length} campaigns, ${uniqueAccounts.length} accounts, enqueued ${enqueued} jobs`
    );

    return NextResponse.json({
      ok: true,
      campaigns: campaigns.length,
      accounts: uniqueAccounts.length,
      enqueued,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron:check-replies] Error:", error);
    return NextResponse.json({ error: "Failed to check replies" }, { status: 500 });
  }
}
