export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

// GET /api/integrations/salesforce/callback — Handle Salesforce OAuth callback
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error || !code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=salesforce_denied`
      );
    }

    const { teamId } = JSON.parse(
      Buffer.from(state, "base64url").toString()
    );

    // Exchange code for tokens
    const tokenRes = await fetch(
      "https://login.salesforce.com/services/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: process.env.SALESFORCE_CLIENT_ID || "",
          client_secret: process.env.SALESFORCE_CLIENT_SECRET || "",
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/salesforce/callback`,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings/integrations?error=salesforce_token_failed`
      );
    }

    const tokens = await tokenRes.json();

    // Store integration
    await db.integration.upsert({
      where: { teamId_provider: { teamId, provider: "SALESFORCE" } },
      create: {
        teamId,
        provider: "SALESFORCE",
        isActive: true,
        credentials: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          instanceUrl: tokens.instance_url,
          tokenType: tokens.token_type,
        },
        config: {
          fieldMappings: {
            email: "Email",
            firstName: "FirstName",
            lastName: "LastName",
            company: "Company",
            jobTitle: "Title",
          },
          syncSettings: {
            autoSync: true,
            syncInterval: 15,
            pushLeads: true,
            pushActivities: true,
            pullLeads: false,
          },
        },
      },
      update: {
        isActive: true,
        credentials: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: encrypt(tokens.refresh_token),
          instanceUrl: tokens.instance_url,
          tokenType: tokens.token_type,
        },
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?success=salesforce`
    );
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings/integrations?error=salesforce_failed`
    );
  }
}
