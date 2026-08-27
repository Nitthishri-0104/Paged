import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

export const metadata: Metadata = { title: "Sign in — Paged" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to get to your notes.">
      <Suspense>
        <LoginForm googleEnabled={isGoogleOAuthConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
