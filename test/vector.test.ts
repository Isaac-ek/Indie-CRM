import test from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, rankByVectorSimilarity, toPgVectorString } from "@/lib/vector";

test("computes exact cosine similarity between normalized and unnormalized vectors", () => {
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];
  const vecD = [0.7071, 0.7071, 0];

  assert.equal(Math.round(cosineSimilarity(vecA, vecB)), 1);
  assert.equal(cosineSimilarity(vecA, vecC), 0);
  assert.ok(cosineSimilarity(vecA, vecD) > 0.7);
});

test("ranks items by vector similarity in descending order", () => {
  const query = [1, 0, 0];
  const candidates = [
    { id: "lead-1", title: "Unrelated", vector: [0, 1, 0] },
    { id: "lead-2", title: "Identical", vector: [1, 0, 0] },
    { id: "lead-3", title: "Partial match", vector: [0.7, 0.7, 0] },
  ];

  const ranked = rankByVectorSimilarity(candidates, query, 2);

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].id, "lead-2");
  assert.equal(ranked[1].id, "lead-3");
});

test("formats array into pgvector compatible string format", () => {
  assert.equal(toPgVectorString([0.1, 0.25, 0.99]), "[0.1,0.25,0.99]");
});
