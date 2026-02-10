import { db } from "@/lib/db";
import { createHmac } from "crypto";

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Dispatch a webhook event to all matching registered webhooks.
 */
export async function dispatchWebhookEvent(
  teamId: string,
  event: string,
  data: Record<string, unknown>
) {
  const webhooks = await db.webhook.findMany({
    where: {
      teamId,
      isActive: true,
      events: { has: event },
    },
  });

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const results = await Promise.allSettled(
    webhooks.map((webhook) => deliverWebhook(webhook.id, webhook.url, webhook.secret, payload))
  );

  return {
    dispatched: webhooks.length,
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  payload: WebhookPayload,
  attempt: number = 1
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  let statusCode: number | undefined;
  let responseText: string | undefined;
  let success = false;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": payload.event,
        "X-Webhook-Timestamp": payload.timestamp,
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    statusCode = res.status;
    responseText = await res.text().catch(() => "");
    success = res.ok;
  } catch (err) {
    responseText = err instanceof Error ? err.message : "Delivery failed";
  }

  // Log delivery
  await db.webhookDelivery.create({
    data: {
      webhookId,
      event: payload.event,
      payload: JSON.parse(JSON.stringify(payload)),
      statusCode,
      response: responseText?.slice(0, 1000),
      attempts: attempt,
      success,
    },
  });

  // Retry up to 3 times on failure
  if (!success && attempt < 3) {
    const delay = attempt * 5000; // 5s, 10s
    await new Promise((resolve) => setTimeout(resolve, delay));
    await deliverWebhook(webhookId, url, secret, payload, attempt + 1);
  }
}

/**
 * Helper to fire common webhook events.
 */
export const webhookEvents = {
  async leadReplied(teamId: string, prospectEmail: string, campaignName: string) {
    return dispatchWebhookEvent(teamId, "lead.replied", {
      prospectEmail,
      campaignName,
    });
  },

  async leadWon(teamId: string, prospectEmail: string, campaignName: string) {
    return dispatchWebhookEvent(teamId, "lead.won", {
      prospectEmail,
      campaignName,
    });
  },

  async campaignCompleted(teamId: string, campaignId: string, campaignName: string) {
    return dispatchWebhookEvent(teamId, "campaign.completed", {
      campaignId,
      campaignName,
    });
  },

  async prospectClicked(teamId: string, prospectEmail: string, url: string) {
    return dispatchWebhookEvent(teamId, "prospect.clicked", {
      prospectEmail,
      url,
    });
  },
};
