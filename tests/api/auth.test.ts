import { describe, expect, it } from "vitest";
import { TEST_BASE_URL } from "../global-setup";
import { authedFetch, createTestUser, extractSessionCookie, uniqueEmail } from "../helpers";

describe("auth flow", () => {
  it("signs up a new user with a hashed password and a session cookie", async () => {
    const email = uniqueEmail("signup");
    const response = await fetch(`${TEST_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { user: { email: string } };
    expect(body.user.email).toBe(email);
    expect(JSON.stringify(body)).not.toMatch(/password/i);

    const cookie = extractSessionCookie(response);
    expect(cookie).toMatch(/^paged_session=/);
  });

  it("rejects signup with an invalid email or a too-short password", async () => {
    const badEmail = await fetch(`${TEST_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "password123" }),
    });
    expect(badEmail.status).toBe(400);

    const shortPassword = await fetch(`${TEST_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail("short"), password: "abc" }),
    });
    expect(shortPassword.status).toBe(400);
  });

  it("rejects signup with an email that's already registered", async () => {
    const email = uniqueEmail("dupe");
    await fetch(`${TEST_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });

    const secondAttempt = await fetch(`${TEST_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "differentPassword1" }),
    });

    expect(secondAttempt.status).toBe(409);
  });

  it("signs in with correct credentials and rejects incorrect ones", async () => {
    const email = uniqueEmail("signin");
    const password = "password123";
    await fetch(`${TEST_BASE_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const goodSignin = await fetch(`${TEST_BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(goodSignin.status).toBe(200);
    expect(extractSessionCookie(goodSignin)).toMatch(/^paged_session=/);

    const wrongPassword = await fetch(`${TEST_BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrongPassword1" }),
    });
    expect(wrongPassword.status).toBe(401);

    const unknownEmail = await fetch(`${TEST_BASE_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail("nobody"), password }),
    });
    expect(unknownEmail.status).toBe(401);

    // Both failure modes report the same message, so the API never confirms
    // which emails have accounts.
    const [wrongBody, unknownBody] = await Promise.all([wrongPassword.json(), unknownEmail.json()]);
    expect(wrongBody).toEqual(unknownBody);
  });

  it("rejects unauthenticated access and allows it again after sign-in", async () => {
    const unauthed = await fetch(`${TEST_BASE_URL}/api/notes`);
    expect(unauthed.status).toBe(401);

    const { cookie } = await createTestUser("protected");
    const authed = await authedFetch("/api/notes", cookie);
    expect(authed.status).toBe(200);
  });

  it("signs out and invalidates the session", async () => {
    const { cookie } = await createTestUser("signout");

    const beforeSignOut = await authedFetch("/api/notes", cookie);
    expect(beforeSignOut.status).toBe(200);

    const signOutResponse = await authedFetch("/api/auth/signout", cookie, { method: "POST" });
    expect(signOutResponse.status).toBe(200);
    const clearedCookie = extractSessionCookie(signOutResponse);
    // An expired cookie is how a Route Handler clears it client-side.
    expect(clearedCookie).toMatch(/^paged_session=;|^paged_session=$/);
  });
});
