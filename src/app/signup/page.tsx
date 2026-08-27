import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up — Paged" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start capturing notes in a minute.">
      <SignupForm />
    </AuthShell>
  );
}
