import { TEST_BASE_URL } from "./global-setup";

export function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export function extractSessionCookie(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) throw new Error("Expected a Set-Cookie header on the response");
  return setCookie.split(";")[0];
}

interface SignedUpUser {
  cookie: string;
  userId: string;
  email: string;
}

/** Signs up a fresh user with a unique email and returns their session cookie. */
export async function createTestUser(label = "user", password = "password123"): Promise<SignedUpUser> {
  const email = uniqueEmail(label);
  const response = await fetch(`${TEST_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (response.status !== 201) {
    throw new Error(`Failed to create test user: ${response.status} ${await response.text()}`);
  }
  const cookie = extractSessionCookie(response);
  const body = (await response.json()) as { user: { id: string; email: string } };
  return { cookie, userId: body.user.id, email: body.user.email };
}

export function authedFetch(path: string, cookie: string, init?: RequestInit): Promise<Response> {
  return fetch(`${TEST_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Cookie: cookie, ...init?.headers },
  });
}
