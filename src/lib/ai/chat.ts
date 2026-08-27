import "server-only";

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 20_000;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_HISTORY_MESSAGES = 20;

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * A minimal multi-turn chat call to Gemini — plain `fetch`, no SDK, same
 * style as `GeminiProvider`. Chat doesn't fit the per-note `AiProvider`
 * shape (`suggestTags`/`embed`), and there's no meaningful offline fallback
 * for open-ended conversation, so this is a standalone function: the chat
 * UI is hidden entirely (see `isAiConfigured()`) rather than shown with a
 * fake response when no key is set.
 */
export async function chatWithGemini(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  // Keep only the most recent turns — this is a lightweight chat widget,
  // not a full conversation-memory system, and it keeps each request small.
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);

  const response = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: recentMessages.map((message) => ({
        role: message.role,
        parts: [{ text: message.text }],
      })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Gemini chat request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GenerateContentResponse;
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error("Gemini returned an empty response");
  }
  return reply;
}
