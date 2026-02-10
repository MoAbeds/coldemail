export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

// GET /api/email-accounts/connect/google/callback
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

    const clientId =
      process.env.GOOGLE_EMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      process.env.GOOGLE_EMAIL_CLIENT_SECRET ||
      process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/email-accounts/connect/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        new URL(
          "/email-accounts?error=token-exchange-failed",
          process.env.NEXTAUTH_URL
        )
      );
    }

    const tokens = await tokenRes.json();

    // Get user info from Google
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      }
    );

    if (!userInfoRes.ok) {
      return NextResponse.redirect(
        new URL(
          "/email-accounts?error=userinfo-failed",
          process.env.NEXTAUTH_URL
        )
      );
    }

    const userInfo = await userInfoRes.json();
    const email = userInfo.email as string;
    const name = (userInfo.name as string) || email.split("@")[0];

    // Create or update the email account
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
        provider: "GMAIL",
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        imapHost: "imap.gmail.com",
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
        "/email-accounts?success=google-connected",
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
