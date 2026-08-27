export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

/** True once both Google OAuth env vars are set — the sign-in button and routes stay dormant until then. */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Built from the incoming request's own origin rather than a hardcoded env
 * var, so the same code works for `localhost:3000` in dev and whatever
 * domain it's deployed to — the Google Cloud Console redirect URI allowlist
 * is the only place each environment needs registering.
 */
export function googleRedirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}
