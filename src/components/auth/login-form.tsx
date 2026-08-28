"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { GoogleButton } from "@/components/auth/google-button";
import { googleOAuthErrorMessage } from "@/lib/auth/oauth-error-messages";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(googleOAuthErrorMessage(searchParams.get("error")));
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiFetch("/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const destination = searchParams.get("from") ?? "/notes";
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <>
          <GoogleButton />
          <div className="flex items-center gap-3 text-xs font-medium text-stone-500">
            <span className="h-px flex-1 bg-stone-200" aria-hidden />
            or
            <span className="h-px flex-1 bg-stone-200" aria-hidden />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus-visible:border-teal-600"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus-visible:border-teal-600"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-stone-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-teal-700 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
