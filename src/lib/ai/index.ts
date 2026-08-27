import "server-only";
import { GeminiProvider } from "@/lib/ai/gemini-provider";
import { HeuristicProvider } from "@/lib/ai/heuristic-provider";
import type { AiProvider, TagSuggestionInput } from "@/lib/ai/types";

const heuristic = new HeuristicProvider();

function getConfiguredProvider(): AiProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GeminiProvider(apiKey);
}

/**
 * Suggests 2-3 tags for a note. Tries the configured AI provider first (if
 * any) and transparently falls back to the local keyword heuristic on a
 * missing key, a timeout, a rate limit, or any other failure — so a flaky
 * or unconfigured AI backend never blocks note creation, it just means
 * plainer suggestions.
 */
export async function suggestTags(input: TagSuggestionInput): Promise<string[]> {
  const provider = getConfiguredProvider();
  if (!provider) return heuristic.suggestTags(input);

  try {
    const suggestions = await provider.suggestTags(input);
    return suggestions.length > 0 ? suggestions : await heuristic.suggestTags(input);
  } catch (error) {
    console.error(`[ai] "${provider.name}" failed to suggest tags, falling back to heuristic:`, error);
    return heuristic.suggestTags(input);
  }
}

/**
 * Computes an embedding for semantic search. Returns null when no provider
 * is configured or the call fails — callers must treat null as "semantic
 * search unavailable right now" and fall back to substring search rather
 * than erroring out.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const provider = getConfiguredProvider();
  if (!provider) return null;

  try {
    return await provider.embed(text);
  } catch (error) {
    console.error(`[ai] "${provider.name}" failed to embed text:`, error);
    return null;
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
