export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/integrations — List all integrations for user's teams
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true, role: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    if (teamIds.length === 0) {
      return NextResponse.json({ integrations: [] });
    }

    const integrations = await db.integration.findMany({
      where: { teamId: { in: teamIds } },
      select: {
        id: true,
        teamId: true,
        provider: true,
        config: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        // Never expose credentials
        syncLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            status: true,
            direction: true,
            recordsProcessed: true,
            recordsFailed: true,
            errors: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    return NextResponse.json({ integrations });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}
