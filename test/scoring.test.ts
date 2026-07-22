import test from "node:test";
import assert from "node:assert/strict";
import { LeadPriority, LeadStage } from "@/generated/prisma/client";
import { calculateLeadScore } from "@/lib/scoring";

test("calculates higher score for qualified leads with confirmed budget and high priority", () => {
  const highIntentScore = calculateLeadScore({
    stage: LeadStage.QUALIFIED,
    priority: LeadPriority.URGENT,
    budgetStatus: "confirmed $10k",
    messageCount: 5,
  });

  const lowIntentScore = calculateLeadScore({
    stage: LeadStage.NEW,
    priority: LeadPriority.LOW,
    budgetStatus: "unknown",
  });

  assert.ok(highIntentScore > 80, `Expected score > 80, got ${highIntentScore}`);
  assert.ok(lowIntentScore < 50, `Expected score < 50, got ${lowIntentScore}`);
});

test("returns 0 score for lost leads regardless of priority", () => {
  const lostScore = calculateLeadScore({
    stage: LeadStage.LOST,
    priority: LeadPriority.URGENT,
  });

  assert.equal(lostScore, 0);
});

test("applies decay penalty for inactive leads", () => {
  const twoWeeksAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  const inactiveScore = calculateLeadScore({
    stage: LeadStage.QUALIFIED,
    priority: LeadPriority.MEDIUM,
    lastContactAt: twoWeeksAgo,
  });

  const activeScore = calculateLeadScore({
    stage: LeadStage.QUALIFIED,
    priority: LeadPriority.MEDIUM,
    lastContactAt: new Date(),
  });

  assert.ok(inactiveScore < activeScore);
});
