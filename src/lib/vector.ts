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
  if (!queryVector || queryVector.length === 0) {
    return [];
  }

  // Pre-calculate query magnitude once to avoid recalculating for every candidate
  let normQuerySq = 0;
  for (let i = 0; i < queryVector.length; i++) {
    normQuerySq += queryVector[i] * queryVector[i];
  }
  const queryMag = Math.sqrt(normQuerySq);
  if (queryMag === 0) {
    return [];
  }

  const results: Array<T & { similarity: number }> = [];

  for (let idx = 0; idx < candidates.length; idx++) {
    const candidate = candidates[idx];
    const candidateVector = Array.isArray(candidate.vector)
      ? (candidate.vector as number[])
      : null;

    if (!candidateVector || candidateVector.length !== queryVector.length) {
      continue;
    }

    let dotProduct = 0;
    let normCandSq = 0;
    for (let i = 0; i < candidateVector.length; i++) {
      const val = candidateVector[i];
      dotProduct += queryVector[i] * val;
      normCandSq += val * val;
    }

    const candMag = Math.sqrt(normCandSq);
    const similarity = candMag === 0 ? 0 : dotProduct / (queryMag * candMag);
    results.push({ ...candidate, similarity });
  }

  return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

/**
 * Formats a JavaScript vector array into a pgvector string representation: '[0.1, 0.2, ...]'.
 */
export function toPgVectorString(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
