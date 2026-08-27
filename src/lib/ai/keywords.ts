// Common English words that carry no topical meaning on their own, so they
// never make sense as tags even when they show up often in a note.
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "as",
  "by",
  "from",
  "up",
  "down",
  "out",
  "about",
  "into",
  "over",
  "after",
  "before",
  "between",
  "under",
  "again",
  "further",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "can",
  "will",
  "just",
  "should",
  "now",
  "you",
  "he",
  "she",
  "we",
  "they",
  "them",
  "his",
  "her",
  "their",
  "our",
  "your",
  "and",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "get",
  "got",
  "go",
  "going",
  "need",
  "needs",
  "also",
  "still",
  "one",
  "two",
  "three",
]);

/**
 * Ranks the most-repeated meaningful words in a block of text. This is the
 * heuristic fallback for AI tag suggestion — no network call, no API key,
 * just word frequency — so tag suggestions keep working when no AI
 * provider is configured or the configured one is unreachable.
 */
export function extractKeywords(text: string, limit: number): string[] {
  const counts = new Map<string, number>();

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word) && Number.isNaN(Number(word)));

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => titleCase(word));
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
