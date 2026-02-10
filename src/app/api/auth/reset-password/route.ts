import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  validatePasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/auth-email";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { success } = rateLimit(getRateLimitKey(req, "reset-password"), {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!success) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { message: "Reset token is required" },
        { status: 400 }
      );
    }

    const email = await validatePasswordResetToken(token);
    if (!email) {
      return NextResponse.json(
        { message: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    const parsed = resetPasswordSchema.parse(body);
    const hashedPassword = await bcrypt.hash(parsed.password, 12);

    await db.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await consumePasswordResetToken(token);

    return NextResponse.json({ message: "Password has been reset" });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
