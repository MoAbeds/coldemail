export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/integrations/[id]/disconnect — Remove integration
export async function DELETE(
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

    // Only team owner or admin can disconnect
    const membership = await db.teamMember.findUnique({
      where: {
        userId_teamId: { userId: session.user.id, teamId: integration.teamId },
      },
    });

    if (
      integration.team.ownerId !== session.user.id &&
      (!membership || !["OWNER", "ADMIN"].includes(membership.role))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.integration.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
