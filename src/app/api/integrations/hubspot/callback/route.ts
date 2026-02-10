export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

// GET /api/integrations/hubspot/callback — Handle HubSpot OAuth callback
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=hubspot_denied`
      );
    }

    const { teamId } = JSON.parse(
      Buffer.from(state, "base64url").toString()
    );

    // Exchange code for tokens
    const tokenRes = await fetch(
      "https://api.hubapi.com/oauth/v1/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: process.env.HUBSPOT_CLIENT_ID || "",
          client_secret: process.env.HUBSPOT_CLIENT_SECRET || "",
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/hubspot/callback`,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=hubspot_token_failed`
      );
    }

    const tokens = await tokenRes.json();

    await db.integration.upsert({
      where: { teamId_provider: { teamId, provider: "HUBSPOT" } },
      create: {
        teamId,
        provider: "HUBSPOT",
        isActive: true,
        credentials: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresIn: tokens.expires_in,
          tokenExpiresAt: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
        },
        config: {
          fieldMappings: {
            email: "email",
            firstName: "firstname",
            lastName: "lastname",
            company: "company",
            jobTitle: "jobtitle",
          },
          syncSettings: {
            autoSync: true,
            syncInterval: 15,
            pushContacts: true,
            pushActivities: true,
            createDeals: true,
          },
        },
      },
      update: {
        isActive: true,
        credentials: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          expiresIn: tokens.expires_in,
          tokenExpiresAt: new Date(
            Date.now() + tokens.expires_in * 1000
          ).toISOString(),
        },
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?success=hubspot`
    );
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=hubspot_failed`
    );
  }
}
