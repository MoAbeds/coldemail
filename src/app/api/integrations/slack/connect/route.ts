export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

// POST /api/integrations/slack/connect — Connect via incoming webhook URL
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamId, webhookUrl, channel } = await req.json();

    if (!teamId || !webhookUrl) {
      return NextResponse.json(
        { error: "teamId and webhookUrl are required" },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      return NextResponse.json(
        { error: "Invalid Slack webhook URL" },
        { status: 400 }
      );
    }

    const membership = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId } },
    });
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.integration.upsert({
      where: { teamId_provider: { teamId, provider: "SLACK" } },
      create: {
        teamId,
        provider: "SLACK",
        isActive: true,
        credentials: {
          webhookUrl: encrypt(webhookUrl),
        },
        config: {
          channel: channel || "#general",
          notifications: {
            newReply: true,
            campaignMilestones: true,
            dailyDigest: true,
            leadWon: true,
          },
        },
      },
      update: {
        isActive: true,
        credentials: {
          webhookUrl: encrypt(webhookUrl),
        },
        config: {
          channel: channel || "#general",
          notifications: {
            newReply: true,
            campaignMilestones: true,
            dailyDigest: true,
            leadWon: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to connect Slack" },
      { status: 500 }
    );
  }
}
