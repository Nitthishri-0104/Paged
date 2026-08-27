import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  googleRedirectUri,
  isGoogleOAuthConfigured,
} from "@/lib/auth/google-oauth";

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
}

function loginRedirect(request: NextRequest, error: string): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  return NextResponse.redirect(loginUrl);
}

/**
 * Exchanges the authorization code for an access token, fetches the
 * account's profile directly from Google's userinfo endpoint, and signs the
 * user in — creating an account on first sign-in, or linking `googleId`
 * onto an existing email/password account with the same (Google-verified)
 * email address so the same person isn't left with two accounts.
 *
 * No SDK: both calls are plain server-to-server `fetch`s, same style as the
 * Gemini provider, so the whole exchange is visible in this one file rather
 * than hidden behind a library.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isGoogleOAuthConfigured()) {
    return loginRedirect(request, "google_not_configured");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return loginRedirect(request, "google_denied");
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return loginRedirect(request, "google_failed");
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: googleRedirectUri(request.nextUrl.origin),
        grant_type: "authorization_code",
      }),
    });
    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error ?? `Token exchange failed with status ${tokenResponse.status}`);
    }

    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
    if (!userInfoResponse.ok || !userInfo.email || !userInfo.email_verified) {
      throw new Error("Google account has no verified email");
    }

    const email = userInfo.email.toLowerCase();
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({ data: { email, googleId: userInfo.sub } });
    } else if (!user.googleId) {
      user = await db.user.update({ where: { id: user.id }, data: { googleId: userInfo.sub } });
    }

    await setSessionCookie({ userId: user.id, email: user.email });

    const response = NextResponse.redirect(new URL("/notes", request.url));
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("[auth] Google sign-in failed:", error);
    return loginRedirect(request, "google_failed");
  }
}
