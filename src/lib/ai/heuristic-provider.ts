import { extractKeywords } from "@/lib/ai/keywords";
import type { AiProvider, TagSuggestionInput } from "@/lib/ai/types";

const SUGGESTION_COUNT = 3;

/**
 * Zero-dependency fallback used whenever no AI provider is configured, or a
 * configured provider fails or times out. It never touches the network, so
 * it's instant and always available — the tradeoff is that it ranks
 * keywords by frequency rather than actually understanding the note.
 */
export class HeuristicProvider implements AiProvider {
  readonly name = "heuristic";

  async suggestTags({ title, body }: TagSuggestionInput): Promise<string[]> {
    return extractKeywords(`${title} ${title} ${body}`, SUGGESTION_COUNT);
  }
}
