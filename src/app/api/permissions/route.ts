export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPermissions } from "@/lib/security/permissions";

// GET /api/permissions — Get current user's permissions for a team
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let teamId = searchParams.get("teamId");

  // If no teamId, find user's single/first team
  if (!teamId) {
    const memberships = await db.teamMember.findMany({
      where: { userId: session.user.id },
      select: { teamId: true, role: true },
      take: 1,
    });
    if (memberships.length === 0) {
      return NextResponse.json({
        teamId: null,
        role: null,
        permissions: [],
      });
    }
    teamId = memberships[0].teamId;
  }

  const membership = await db.teamMember.findUnique({
    where: { userId_teamId: { userId: session.user.id, teamId } },
  });

  if (!membership) {
    return NextResponse.json({
      teamId,
      role: null,
      permissions: [],
    });
  }

  return NextResponse.json({
    teamId,
    role: membership.role,
    permissions: getPermissions(membership.role),
  });
}
