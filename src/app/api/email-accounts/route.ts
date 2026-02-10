import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { testSmtpConnection, getSmtpDefaults } from "@/lib/email-connection";
import { emailAccountSchema } from "@/lib/validations/campaign";

// GET /api/email-accounts — list all accounts for user
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accounts = await db.emailAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        provider: true,
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

    return NextResponse.json({ accounts });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// POST /api/email-accounts — create a new SMTP account
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = emailAccountSchema.parse(body);

    // Check for duplicate
    const existing = await db.emailAccount.findUnique({
      where: {
        userId_email: {
          userId: session.user.id,
          email: parsed.email.toLowerCase(),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This email account is already connected" },
        { status: 409 }
      );
    }

    // For SMTP accounts, fill defaults and test connection
    let smtpHost = parsed.smtpHost;
    let smtpPort = parsed.smtpPort;
    let imapHost = parsed.imapHost;
    let imapPort = parsed.imapPort;

    if (parsed.provider !== "SMTP") {
      const defaults = getSmtpDefaults(parsed.provider);
      smtpHost = smtpHost || defaults.smtpHost;
      smtpPort = smtpPort || defaults.smtpPort;
      imapHost = imapHost || defaults.imapHost;
      imapPort = imapPort || defaults.imapPort;
    }

    // Test SMTP if credentials provided
    if (smtpHost && parsed.smtpUser && parsed.smtpPassword) {
      const test = await testSmtpConnection({
        host: smtpHost,
        port: smtpPort || 587,
        user: parsed.smtpUser,
        pass: parsed.smtpPassword,
      });

      if (!test.success) {
        return NextResponse.json(
          { error: `SMTP connection failed: ${test.error}` },
          { status: 400 }
        );
      }
    }

    const account = await db.emailAccount.create({
      data: {
        userId: session.user.id,
        email: parsed.email.toLowerCase(),
        displayName: parsed.displayName,
        provider: parsed.provider,
        smtpHost,
        smtpPort,
        smtpUser: parsed.smtpUser || null,
        smtpPassword: parsed.smtpPassword ? encrypt(parsed.smtpPassword) : null,
        imapHost,
        imapPort,
        dailyLimit: parsed.dailyLimit,
        isVerified: !!(smtpHost && parsed.smtpUser && parsed.smtpPassword),
        lastConnectedAt: new Date(),
      },
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

    return NextResponse.json({ account }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create email account" },
      { status: 500 }
    );
  }
}
