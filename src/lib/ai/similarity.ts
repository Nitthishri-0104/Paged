/**
 * Cosine similarity between two equal-length vectors, in [-1, 1] (in
 * practice [0, 1] for the non-negative embeddings semantic search uses).
 * Returns 0 for mismatched or empty/zero vectors instead of throwing or
 * producing NaN, since callers rank many notes and a malformed one
 * shouldn't blow up the whole search.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}
