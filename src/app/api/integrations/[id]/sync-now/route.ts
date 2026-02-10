export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { runSync } from "@/lib/integrations/sync-engine";

// POST /api/integrations/[id]/sync-now — Trigger manual sync
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await db.integration.findUnique({
      where: { id: params.id },
      include: { team: { select: { ownerId: true } } },
    });

    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await db.teamMember.findUnique({
      where: {
        userId_teamId: { userId: session.user.id, teamId: integration.teamId },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!integration.isActive) {
      return NextResponse.json(
        { error: "Integration is not active" },
        { status: 400 }
      );
    }

    const result = await runSync(integration);

    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
