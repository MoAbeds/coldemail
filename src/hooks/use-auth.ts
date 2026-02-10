"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useUser() {
  const { data: session, status, update } = useSession();

  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isEmailVerified: !!session?.user?.emailVerified,
    refreshSession: update,
  };
}

export function useAuth() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push("/dashboard");
      router.refresh();
    },
    [router]
  );

  const loginWithGoogle = useCallback(() => {
    signIn("google", { callbackUrl: "/dashboard" });
  }, []);

  const register = useCallback(
    async (data: { name: string; email: string; password: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.message || "Registration failed");
      }

      // Auto sign-in after registration
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // Account created but auto-login failed, redirect to sign-in
        router.push("/auth/signin");
        return;
      }

      router.push("/auth/verify-email");
      router.refresh();
    },
    [router]
  );

  const logout = useCallback(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  return {
    user: session?.user ?? null,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshSession: update,
  };
}
