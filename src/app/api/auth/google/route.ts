import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_OAUTH_STATE_COOKIE,
  googleRedirectUri,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-oauth";

const STATE_COOKIE_MAX_AGE_SECONDS = 10 * 60;

/**
 * Starts the "Continue with Google" flow: redirects to Google's consent
 * screen with a random `state` value, which is also stashed in a short-lived
 * cookie so the callback can confirm the response actually corresponds to a
 * request this server made (standard OAuth CSRF protection).
 */
export function GET(request: NextRequest): NextResponse {
  if (!isGoogleOAuthConfigured()) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "google_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const state = randomBytes(16).toString("hex");
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set("redirect_uri", googleRedirectUri(request.nextUrl.origin));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
