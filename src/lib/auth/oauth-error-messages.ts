/** Maps the `?error=` code the Google callback route redirects with to copy a user can act on. */
export function googleOAuthErrorMessage(code: string | null): string | null {
  switch (code) {
    case "google_not_configured":
      return "Google sign-in isn't set up on this deployment yet — use email and password instead.";
    case "google_denied":
      return "Google sign-in was cancelled.";
    case "google_failed":
      return "Google sign-in failed. Please try again, or use email and password.";
    default:
      return null;
  }
}
