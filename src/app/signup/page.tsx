import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { isGoogleOAuthConfigured } from "@/lib/auth/google-oauth";

export const metadata: Metadata = { title: "Sign up — Paged" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start capturing notes in a minute.">
      <Suspense>
        <SignupForm googleEnabled={isGoogleOAuthConfigured()} />
      </Suspense>
    </AuthShell>
  );
}
