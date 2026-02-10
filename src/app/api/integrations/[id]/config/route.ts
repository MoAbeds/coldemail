export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/integrations/[id]/config — Update field mapping and settings
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await db.integration.findUnique({
      where: { id: params.id },
      select: { id: true, teamId: true, config: true },
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

    const body = await req.json();
    const { fieldMappings, syncSettings } = body;

    const existingConfig = (integration.config as Record<string, unknown>) || {};
    const updatedConfig = {
      ...existingConfig,
      ...(fieldMappings !== undefined && { fieldMappings }),
      ...(syncSettings !== undefined && { syncSettings }),
    };

    const updated = await db.integration.update({
      where: { id: params.id },
      data: { config: updatedConfig },
      select: { id: true, config: true, updatedAt: true },
    });

    return NextResponse.json({ integration: updated });
  } catch {
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
