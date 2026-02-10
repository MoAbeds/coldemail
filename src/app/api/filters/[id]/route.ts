export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/filters/[id] — Delete a saved filter
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

    const filter = await db.savedFilter.findUnique({ where: { id } });
    if (!filter) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only owner can delete
    if (filter.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.savedFilter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete filter" }, { status: 500 });
  }
}

// PUT /api/filters/[id] — Update a saved filter
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { name, filters, isShared } = await req.json();

    const existing = await db.savedFilter.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.savedFilter.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(filters !== undefined ? { filters } : {}),
        ...(isShared !== undefined ? { isShared } : {}),
      },
    });

    return NextResponse.json({ filter: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update filter" }, { status: 500 });
  }
}
