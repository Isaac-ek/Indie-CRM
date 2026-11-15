// Isolated process: simulate configured AI credentials and intercept every HTTP
// attempt, proving the demo guard works even when production has an API key.
import assert from "node:assert/strict";
import { workflowDatabaseUrl } from "./workflow-database";

process.env.DATABASE_URL = workflowDatabaseUrl();
process.env.OPENAI_API_KEY = "sk-local-demo-boundary-test-never-send";
let httpAttempts = 0;
globalThis.fetch = async () => { httpAttempts += 1; throw new Error("Network forbidden in demo AI test"); };

async function main() {
  const { getPrismaClient } = require("../../src/lib/prisma") as typeof import("../../src/lib/prisma");
  const { upsertNoteEmbedding, generateSearchEmbedding, generateLeadIntelligence, generateReplySuggestion, generateFollowUpRecommendation, generateGroundedSearchAnswer } = require("../../src/lib/ai") as typeof import("../../src/lib/ai");
  const prisma = getPrismaClient();
  try {
    const demo = await prisma.publicDemo.findUniqueOrThrow({ where: { tenantId: process.argv[2] } });
    const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId: demo.tenantId }, include: { notes: true } });
    const common = { tenantId: demo.tenantId, leadId: lead.id, conversationId: null, contextNotes: null, requestedById: demo.userId, contactName: "Maya", company: "Sample Studio", summary: "Sample website inquiry", latestMessage: "Arrange a sample discovery call" };
    const embedding = await upsertNoteEmbedding({ tenantId: demo.tenantId, noteId: lead.notes[0].id, content: lead.notes[0].content });
    assert.equal(embedding.model, "fallback-local-embedding");
    assert.equal((await generateSearchEmbedding("sample discovery", demo.tenantId)).length, 64);
    await generateLeadIntelligence({ ...common, inquiry: "Sample website inquiry" });
    await generateReplySuggestion({ ...common, tone: "Practical" });
    await generateFollowUpRecommendation(common);
    await generateGroundedSearchAnswer({ tenantId: demo.tenantId, query: "sample", evidence: [{ label: "Maya’s sample brief", quote: "Sample website inquiry" }] });
    assert.equal(httpAttempts, 0, "A public demo must never call an external AI provider");
    const generations = await prisma.aIGeneration.findMany({ where: { tenantId: demo.tenantId } });
    assert.ok(generations.length >= 5);
    assert.ok(generations.every((generation) => generation.model === "fallback-local"));
    console.log("Demo AI boundary passed: zero HTTP attempts with a configured key.");
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
