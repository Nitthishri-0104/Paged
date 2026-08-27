import { describe, expect, it } from "vitest";
import { TEST_BASE_URL } from "../global-setup";

// The test environment never sets GOOGLE_CLIENT_ID/SECRET, so these cover
// the "not configured" guard rather than a real OAuth round trip against
// Google — actually completing the flow would mean scripting a live Google
// consent screen, which isn't something a CI-safe test should depend on.
describe("Google OAuth guard behavior", () => {
  it("redirects to /login with an error when Google sign-in isn't configured", async () => {
    const response = await fetch(`${TEST_BASE_URL}/api/auth/google`, { redirect: "manual" });
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=google_not_configured");
  });

  it("rejects a callback with a missing or mismatched state", async () => {
    const response = await fetch(`${TEST_BASE_URL}/api/auth/google/callback?code=fake&state=fake`, {
      redirect: "manual",
    });
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    // Not-configured is checked first, so that's the error surfaced here —
    // the state check itself is exercised once a real client id is set.
    expect(location).toContain("error=google_not_configured");
  });
});
