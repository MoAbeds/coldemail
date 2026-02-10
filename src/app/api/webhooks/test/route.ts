export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createHmac } from "crypto";

// POST /api/webhooks/test — Send a test event to a webhook
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { webhookId } = await req.json();
    if (!webhookId) {
      return NextResponse.json({ error: "webhookId required" }, { status: 400 });
    }

    const webhook = await db.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify membership
    const membership = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: webhook.teamId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const payload = {
      event: "webhook.test",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook delivery from ColdClaude.",
        webhookId: webhook.id,
      },
    };

    const body = JSON.stringify(payload);
    const signature = createHmac("sha256", webhook.secret).update(body).digest("hex");

    let statusCode: number | undefined;
    let responseText: string | undefined;
    let success = false;

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": "webhook.test",
          "X-Webhook-Timestamp": payload.timestamp,
        },
        body,
        signal: AbortSignal.timeout(10_000),
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
        webhookId: webhook.id,
        event: "webhook.test",
        payload: JSON.parse(JSON.stringify(payload)),
        statusCode,
        response: responseText?.slice(0, 1000),
        attempts: 1,
        success,
      },
    });

    return NextResponse.json({ success, statusCode, response: responseText?.slice(0, 200) });
  } catch {
    return NextResponse.json({ error: "Failed to test webhook" }, { status: 500 });
  }
}
