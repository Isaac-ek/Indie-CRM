/**
 * Computes cosine similarity between two numerical embedding vectors.
 * Returns a value between -1.0 and 1.0 (or 0 if magnitude is 0).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Ranks a list of candidate items with embedding vectors against a target query vector.
 */
export function rankByVectorSimilarity<T extends { vector?: number[] | unknown }>(
  candidates: T[],
  queryVector: number[],
  topK = 5
): Array<T & { similarity: number }> {
  return candidates
    .map((candidate) => {
      const candidateVector = Array.isArray(candidate.vector)
        ? (candidate.vector as number[])
        : [];
      const similarity = cosineSimilarity(queryVector, candidateVector);
      return { ...candidate, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Formats a JavaScript vector array into a pgvector string representation: '[0.1, 0.2, ...]'.
 */
export function toPgVectorString(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
