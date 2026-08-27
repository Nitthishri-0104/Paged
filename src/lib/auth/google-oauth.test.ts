import { afterEach, describe, expect, it } from "vitest";
import { googleRedirectUri, isGoogleOAuthConfigured } from "./google-oauth";

describe("googleRedirectUri", () => {
  it("appends the callback path to the given origin", () => {
    expect(googleRedirectUri("http://localhost:3000")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(googleRedirectUri("https://paged.example.com")).toBe("https://paged.example.com/api/auth/google/callback");
  });
});

describe("isGoogleOAuthConfigured", () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
  });

  it("is false when either env var is missing", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(isGoogleOAuthConfigured()).toBe(false);

    process.env.GOOGLE_CLIENT_ID = "client-id";
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(isGoogleOAuthConfigured()).toBe(false);
  });

  it("is true once both are set", () => {
    process.env.GOOGLE_CLIENT_ID = "client-id";
    process.env.GOOGLE_CLIENT_SECRET = "client-secret";
    expect(isGoogleOAuthConfigured()).toBe(true);
  });
});
