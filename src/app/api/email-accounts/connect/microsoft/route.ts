export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// GET /api/email-accounts/connect/microsoft — initiate Microsoft OAuth
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "Microsoft OAuth is not configured" },
        { status: 501 }
      );
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/email-accounts/connect/microsoft/callback`;
    const state = crypto.randomBytes(16).toString("hex");

    const scopes = [
      "openid",
      "profile",
      "email",
      "offline_access",
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/Mail.Read",
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      response_mode: "query",
      state,
    });

    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    return NextResponse.json({ url, state });
  } catch {
    return NextResponse.json(
      { error: "Failed to initiate Microsoft OAuth" },
      { status: 500 }
    );
  }
}
