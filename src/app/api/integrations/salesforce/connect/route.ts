export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET /api/integrations/salesforce/connect — Redirect to Salesforce OAuth
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "teamId required" }, { status: 400 });
    }

    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/salesforce/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: "Salesforce not configured" },
        { status: 500 }
      );
    }

    const state = Buffer.from(
      JSON.stringify({ teamId, userId: session.user.id })
    ).toString("base64url");

    const authUrl = new URL("https://login.salesforce.com/services/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "api refresh_token full");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch {
    return NextResponse.json({ error: "Failed to connect" }, { status: 500 });
  }
}
