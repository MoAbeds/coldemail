export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { withAuth, withPermission } from "@/lib/security/guards";

// GET /api/webhooks — List webhooks for user's teams
export const GET = withAuth(async (_req, ctx) => {
  const memberships = await db.teamMember.findMany({
    where: { userId: ctx.userId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  const webhooks = await db.webhook.findMany({
    where: { teamId: { in: teamIds } },
    include: {
      _count: { select: { deliveries: true } },
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { success: true, createdAt: true, statusCode: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(webhooks);
});

// POST /api/webhooks — Create a new webhook
export const POST = withPermission(
  "manage_webhooks",
  async (req, ctx) => {
    const { url, events, description } = await req.json();

    if (!url || !events?.length) {
      return NextResponse.json(
        { error: "url and events are required" },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const secret = randomBytes(32).toString("hex");

    const webhook = await db.webhook.create({
      data: {
        teamId: ctx.teamId,
        url,
        secret,
        events,
        isActive: true,
      },
    });

    return NextResponse.json({
      ...webhook,
      description,
      message: "Webhook created. Save the secret — it won't be shown again.",
    });
  },
  {
    auditAction: "webhook.created",
    auditEntity: "Webhook",
  }
);
