export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/webhooks/[id] — Delete a webhook
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const webhook = await db.webhook.findUnique({ where: { id } });
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

    // Delete deliveries first, then webhook
    await db.webhookDelivery.deleteMany({ where: { webhookId: id } });
    await db.webhook.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}

// PATCH /api/webhooks/[id] — Toggle webhook active status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { isActive } = await req.json();

    const webhook = await db.webhook.findUnique({ where: { id } });
    if (!webhook) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: webhook.teamId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a team member" }, { status: 403 });
    }

    const updated = await db.webhook.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }
}
