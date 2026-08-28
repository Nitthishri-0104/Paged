import type { AiProvider, TagSuggestionInput } from "@/lib/ai/types";

const DEFAULT_MODEL = "gemini-2.5-flash";
// text-embedding-004 was shut down by Google on 2026-01-14; every embed()
// call against it now 404s ("is not found for API version v1beta"), which
// looked like "semantic search isn't available" in the UI even with a
// perfectly valid key. gemini-embedding-001 is the current replacement.
// Note: it outputs 3072-dim vectors vs. the old model's 768 — a note whose
// `embedding` column still holds an old vector won't match by cosine
// similarity against a new query vector (mismatched lengths score 0, see
// `cosineSimilarity`), so it just falls back to the substring-match union
// for that note until it's next saved and re-embedded under the new model.
const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const REQUEST_TIMEOUT_MS = 8000;
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface EmbedContentResponse {
  embedding?: { values?: number[] };
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
  private readonly embeddingModel: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    this.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
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
        generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
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

  async embed(text: string): Promise<number[] | null> {
    const response = await fetch(`${API_BASE}/${this.embeddingModel}:embedContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${this.embeddingModel}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Gemini embedContent failed with status ${response.status}`);
    }

    const data = (await response.json()) as EmbedContentResponse;
    return data.embedding?.values ?? null;
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
