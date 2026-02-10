import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptIfPresent } from "@/lib/crypto";
import { testSmtpConnection } from "@/lib/email-connection";

// POST /api/email-accounts/[id]/test
export async function POST(
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
    });

    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!account.smtpHost || !account.smtpUser || !account.smtpPassword) {
      return NextResponse.json(
        { error: "SMTP credentials are incomplete" },
        { status: 400 }
      );
    }

    const password = decryptIfPresent(account.smtpPassword);
    if (!password) {
      return NextResponse.json(
        { error: "Could not decrypt SMTP password" },
        { status: 500 }
      );
    }

    const result = await testSmtpConnection({
      host: account.smtpHost,
      port: account.smtpPort || 587,
      user: account.smtpUser,
      pass: password,
    });

    if (result.success) {
      await db.emailAccount.update({
        where: { id: params.id },
        data: {
          isVerified: true,
          isActive: true,
          lastConnectedAt: new Date(),
          lastError: null,
          lastErrorAt: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Connection successful",
      });
    }

    await db.emailAccount.update({
      where: { id: params.id },
      data: {
        lastError: result.error || "Connection failed",
        lastErrorAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Connection test failed" },
      { status: 500 }
    );
  }
}
