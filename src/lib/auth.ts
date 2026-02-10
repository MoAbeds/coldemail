import { NextAuthOptions, getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, populate token from user object
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
      }

      // On session update (e.g. after email verification), refresh from DB
      if (trigger === "update" && session) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.emailVerified = dbUser.emailVerified;
        }
      }

      return token;
    },
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
    async signIn({ user, account }) {
      // OAuth providers always verify email
      if (account?.provider !== "credentials") {
        return true;
      }

      // For credentials, allow sign-in but the app layer checks emailVerified
      if (user) {
        return true;
      }

      return false;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create a personal team on first sign-up via OAuth
      if (user.id && user.email) {
        const existingTeam = await db.team.findFirst({
          where: { ownerId: user.id },
        });
        if (!existingTeam) {
          const team = await db.team.create({
            data: {
              name: `${user.name ?? "My"}'s Team`,
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
        }
      }
    },
    async signIn({ user }) {
      // Update last sign-in (updatedAt serves this purpose)
      if (user.id) {
        await db.user.update({
          where: { id: user.id },
          data: { updatedAt: new Date() },
        });
      }
    },
  },
};

// ─── Server-side helpers ────────────────────────────────────

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  return session;
}

export async function requireVerifiedEmail() {
  const session = await requireAuth();
  if (!session.user.emailVerified) {
    redirect("/auth/verify-email");
  }
  return session;
}
