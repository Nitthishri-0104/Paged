import type { AiProvider, TagSuggestionInput } from "@/lib/ai/types";

// gemini-2.5-flash is no longer available to new users as of 2026; Google's
// own 404 error for it points here. gemini-3.6-flash reasons by default
// (see the `thinkingConfig` below), so every call pins `thinkingLevel: "LOW"`
// to bound that overhead — worth knowing since it still eats real output
// budget (confirmed: a 100-token cap left ~0 room for an actual answer).
const DEFAULT_MODEL = "gemini-3.6-flash";
const REQUEST_TIMEOUT_MS = 8000;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/**
 * Talks to Google's Gemini API directly over `fetch` (no SDK dependency, so
 * the request/response shape is fully visible here). Gemini was chosen
 * because it has a genuinely free API tier suitable for a take-home
 * project — swap this file for an OpenAI/Anthropic/local-model
 * implementation of `AiProvider` without touching any caller.
 */
export class GeminiProvider implements AiProvider {
  readonly name = "gemini";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  }

  async suggestTags({ title, body }: TagSuggestionInput): Promise<string[]> {
    const prompt = [
      "Suggest 2 to 3 short tags (one or two words each) that categorize the note below.",
      "Respond with ONLY a JSON array of strings — no prose, no markdown fences.",
      'Example response: ["Wedding", "Budget", "Planning"]',
      "",
      `Title: ${title}`,
      `Note: ${body.slice(0, 4000)}`,
    ].join("\n");

    const response = await fetch(`${API_BASE}/${this.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // 500, not ~100, specifically because gemini-3.6-flash's minimum
        // thinking overhead alone can run 90-300 tokens even at the lowest
        // thinking level — a tight budget here gets silently truncated
        // (finishReason: "MAX_TOKENS") before any visible JSON is written.
        generationConfig: { temperature: 0.2, maxOutputTokens: 500, thinkingConfig: { thinkingLevel: "LOW" } },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Gemini generateContent failed with status ${response.status}`);
    }

    const data = (await response.json()) as GenerateContentResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    return parseTagArray(text);
  }
}

function parseTagArray(text: string): string[] {
  const jsonMatch = /\[[\s\S]*\]/.exec(text);
  if (!jsonMatch) return [];

  try {
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}
