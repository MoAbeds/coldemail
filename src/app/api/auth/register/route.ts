import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/auth-email";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { success } = rateLimit(getRateLimitKey(req, "register"), {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 5 per 15 minutes
    });

    if (!success) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.parse({
      ...body,
      confirmPassword: body.confirmPassword ?? body.password,
    });

    const email = parsed.email.toLowerCase().trim();

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.password, 12);

    const user = await db.user.create({
      data: {
        name: parsed.name,
        email,
        password: hashedPassword,
      },
    });

    // Create personal team
    const team = await db.team.create({
      data: {
        name: `${parsed.name}'s Team`,
        ownerId: user.id,
      },
    });

    await db.teamMember.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role: "OWNER",
        acceptedAt: new Date(),
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, parsed.name).catch(console.error);

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
