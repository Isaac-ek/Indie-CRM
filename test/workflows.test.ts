import test from "node:test";
import assert from "node:assert/strict";
import { LeadPriority, LeadStage } from "@/generated/prisma/client";
import { evaluateWorkflowRules, WorkflowRule } from "@/lib/workflows";

test("evaluates and triggers matching workflow rules for stage change", () => {
  const rules: WorkflowRule[] = [
    {
      id: "rule-1",
      tenantId: "tenant-99",
      name: "Auto Urgent for Qualified High-Score Leads",
      trigger: "ON_STAGE_CHANGE",
      targetStage: LeadStage.QUALIFIED,
      minScore: 70,
      action: "AUTO_SET_PRIORITY",
      actionPayload: { priority: "URGENT" },
      enabled: true,
    },
    {
      id: "rule-2",
      tenantId: "tenant-99",
      name: "Disabled Rule",
      trigger: "ON_STAGE_CHANGE",
      targetStage: LeadStage.QUALIFIED,
      action: "TAG_LEAD",
      actionPayload: { tag: "vip" },
      enabled: false,
    },
  ];

  const context = {
    leadId: "lead-777",
    tenantId: "tenant-99",
    stage: LeadStage.QUALIFIED,
    score: 85,
    priority: LeadPriority.MEDIUM,
  };

  const actions = evaluateWorkflowRules(rules, context, "ON_STAGE_CHANGE");

  assert.equal(actions.length, 1);
  assert.equal(actions[0].ruleId, "rule-1");
  assert.equal(actions[0].action, "AUTO_SET_PRIORITY");
});

test("ignores rules if minScore threshold is not met", () => {
  const rules: WorkflowRule[] = [
    {
      id: "rule-high-bar",
      tenantId: "tenant-99",
      name: "High Score Lead Rule",
      trigger: "ON_HIGH_SCORE",
      minScore: 90,
      action: "TAG_LEAD",
      actionPayload: { tag: "hot-prospect" },
      enabled: true,
    },
  ];

  const context = {
    leadId: "lead-888",
    tenantId: "tenant-99",
    stage: LeadStage.NEW,
    score: 60,
    priority: LeadPriority.MEDIUM,
  };

  const actions = evaluateWorkflowRules(rules, context, "ON_HIGH_SCORE");
  assert.equal(actions.length, 0);
});
