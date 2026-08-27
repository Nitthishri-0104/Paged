"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await apiFetch("/api/auth/signout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60"
    >
      <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path
          d="M7 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H7M13 13l3-3m0 0-3-3m3 3H7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
