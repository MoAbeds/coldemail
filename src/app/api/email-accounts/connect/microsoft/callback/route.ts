export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

// GET /api/email-accounts/connect/microsoft/callback
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/auth/signin", process.env.NEXTAUTH_URL)
      );
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(
        new URL(
          "/email-accounts?error=oauth-denied",
          process.env.NEXTAUTH_URL
        )
      );
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID!;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/email-accounts/connect/microsoft/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }
    );

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        new URL(
          "/email-accounts?error=token-exchange-failed",
          process.env.NEXTAUTH_URL
        )
      );
    }

    const tokens = await tokenRes.json();

    // Get user info from Microsoft Graph
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!meRes.ok) {
      return NextResponse.redirect(
        new URL(
          "/email-accounts?error=userinfo-failed",
          process.env.NEXTAUTH_URL
        )
      );
    }

    const me = await meRes.json();
    const email = (me.mail || me.userPrincipalName) as string;
    const name = (me.displayName as string) || email.split("@")[0];

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await db.emailAccount.upsert({
      where: {
        userId_email: { userId: session.user.id, email },
      },
      create: {
        userId: session.user.id,
        email,
        displayName: name,
        provider: "OUTLOOK",
        smtpHost: "smtp.office365.com",
        smtpPort: 587,
        imapHost: "outlook.office365.com",
        imapPort: 993,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : null,
        tokenExpiresAt: expiresAt,
        isVerified: true,
        isActive: true,
        lastConnectedAt: new Date(),
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : undefined,
        tokenExpiresAt: expiresAt,
        isVerified: true,
        isActive: true,
        lastConnectedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      },
    });

    return NextResponse.redirect(
      new URL(
        "/email-accounts?success=microsoft-connected",
        process.env.NEXTAUTH_URL
      )
    );
  } catch {
    return NextResponse.redirect(
      new URL(
        "/email-accounts?error=connection-failed",
        process.env.NEXTAUTH_URL
      )
    );
  }
}
