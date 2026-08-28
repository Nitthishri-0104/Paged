export interface TagSuggestionInput {
  title: string;
  body: string;
}

/**
 * Abstraction over "some AI backend that can suggest tags for a note".
 * Swapping providers (Gemini, OpenAI, a local model, ...) means writing one
 * class that implements this — nothing else in the app changes.
 */
export interface AiProvider {
  readonly name: string;
  suggestTags(input: TagSuggestionInput): Promise<string[]>;
}
