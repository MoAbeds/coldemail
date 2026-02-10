import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

// GET /api/email-accounts/[id]
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await db.emailAccount.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        provider: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        imapHost: true,
        imapPort: true,
        isVerified: true,
        isActive: true,
        dailyLimit: true,
        sentToday: true,
        healthScore: true,
        bounceCount: true,
        spamCount: true,
        errorCount: true,
        spfConfigured: true,
        dkimConfigured: true,
        dmarcConfigured: true,
        lastConnectedAt: true,
        lastError: true,
        lastErrorAt: true,
        createdAt: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

// PUT /api/email-accounts/[id]
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.emailAccount.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();

    const updateData: Record<string, unknown> = {};

    if (body.displayName !== undefined) updateData.displayName = body.displayName;
    if (body.smtpHost !== undefined) updateData.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) updateData.smtpPort = body.smtpPort;
    if (body.smtpUser !== undefined) updateData.smtpUser = body.smtpUser;
    if (body.smtpPassword !== undefined) {
      updateData.smtpPassword = encrypt(body.smtpPassword);
    }
    if (body.imapHost !== undefined) updateData.imapHost = body.imapHost;
    if (body.imapPort !== undefined) updateData.imapPort = body.imapPort;
    if (body.dailyLimit !== undefined) updateData.dailyLimit = body.dailyLimit;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const account = await db.emailAccount.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        displayName: true,
        provider: true,
        isVerified: true,
        isActive: true,
        dailyLimit: true,
        healthScore: true,
      },
    });

    return NextResponse.json({ account });
  } catch {
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

// DELETE /api/email-accounts/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.emailAccount.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if account is used by active campaigns
    const activeCampaigns = await db.campaign.count({
      where: {
        emailAccountId: params.id,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
    });

    if (activeCampaigns > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${activeCampaigns} active campaign(s) use this account. Pause or reassign them first.`,
        },
        { status: 400 }
      );
    }

    await db.emailAccount.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
