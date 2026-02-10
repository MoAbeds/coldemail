export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/teams — list user's teams
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    const teams = memberships.map((m) => ({
      teamId: m.team.id,
      teamName: m.team.name,
      role: m.role,
    }));

    return NextResponse.json({ teams });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
