import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth-email";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(
        new URL("/auth/verify-email?error=missing-params", req.url)
      );
    }

    const isValid = await verifyEmailToken(token, email);

    if (!isValid) {
      return NextResponse.redirect(
        new URL("/auth/verify-email?error=invalid-token", req.url)
      );
    }

    return NextResponse.redirect(
      new URL("/auth/verify-email?success=true", req.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/auth/verify-email?error=server-error", req.url)
    );
  }
}
