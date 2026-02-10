export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/filters?scope=campaigns|leads|prospects — List saved filters
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope");

    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);

    const filters = await db.savedFilter.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          ...(teamIds.length > 0
            ? [{ teamId: { in: teamIds }, isShared: true }]
            : []),
        ],
        ...(scope ? { scope } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ filters });
  } catch {
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}

// POST /api/filters — Save a filter
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, scope, filters, isShared, teamId } = await req.json();

    if (!name || !scope || !filters) {
      return NextResponse.json(
        { error: "name, scope, and filters are required" },
        { status: 400 }
      );
    }

    // Get teamId if not provided
    let resolvedTeamId = teamId;
    if (!resolvedTeamId) {
      const membership = await db.teamMember.findFirst({
        where: { userId: session.user.id },
        select: { teamId: true },
      });
      resolvedTeamId = membership?.teamId;
    }

    if (!resolvedTeamId) {
      return NextResponse.json({ error: "No team found" }, { status: 400 });
    }

    const saved = await db.savedFilter.create({
      data: {
        teamId: resolvedTeamId,
        userId: session.user.id,
        name,
        scope,
        filters,
        isShared: isShared || false,
      },
    });

    return NextResponse.json({ filter: saved }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save filter" }, { status: 500 });
  }
}
