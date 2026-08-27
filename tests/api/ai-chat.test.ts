import { describe, expect, it } from "vitest";
import { createTestUser, authedFetch } from "../helpers";

// The test environment never sets GEMINI_API_KEY (see .env.test), so this
// covers the "not configured" guard rather than a real Gemini round trip —
// same reasoning as tests/api/google-oauth.test.ts.
describe("AI chat guard behavior", () => {
  it("requires authentication", async () => {
    const response = await authedFetch("/api/ai/chat", "", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", text: "hi" }] }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 400 when AI isn't configured", async () => {
    const { cookie } = await createTestUser("ai-chat");
    const response = await authedFetch("/api/ai/chat", cookie, {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", text: "hi" }] }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/not configured|isn't configured/i);
  });

  it("rejects an empty messages array", async () => {
    const { cookie } = await createTestUser("ai-chat-empty");
    const response = await authedFetch("/api/ai/chat", cookie, {
      method: "POST",
      body: JSON.stringify({ messages: [] }),
    });
    expect(response.status).toBe(400);
  });
});
