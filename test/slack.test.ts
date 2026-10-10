import test from "node:test";
import assert from "node:assert/strict";
import { formatHotLeadSlackPayload, sendSlackWebhook, notifyHotLeadSlack } from "../src/lib/slack";
import { evaluateWorkflowRules, WorkflowRule } from "../src/lib/workflows";
import { LeadPriority, LeadStage } from "../src/generated/prisma/client";

test("formatHotLeadSlackPayload constructs valid Slack Block Kit JSON payload", () => {
  const payload = formatHotLeadSlackPayload({
    leadId: "lead-123",
    workspaceSlug: "northstar-studio",
    title: "Brand Refresh Project",
    contactName: "Elena Vance",
    contactEmail: "elena@vance.test",
    company: "Vance Design",
    stage: "QUALIFIED",
    priority: "HIGH",
    score: 88,
    summary: "High urgency branding inquiry with $20k budget.",
    appBaseUrl: "https://crm.test",
  });

  assert.equal(payload.text, "🔥 Hot Lead Alert: Brand Refresh Project for Elena Vance (Vance Design)");
  assert.ok(Array.isArray(payload.blocks));
  assert.equal(payload.blocks!.length, 4);

  // Header block check
  const headerBlock = payload.blocks![0];
  assert.equal(headerBlock.type, "header");
  assert.equal(headerBlock.text?.text, "🔥 Hot Lead Alert: Brand Refresh Project");

  // Fields block check
  const fieldsBlock = payload.blocks![1];
  assert.equal(fieldsBlock.type, "section");
  assert.ok(fieldsBlock.fields);
  assert.equal(fieldsBlock.fields!.length, 6);
  assert.match(fieldsBlock.fields![0].text, /Elena Vance/);
  assert.match(fieldsBlock.fields![1].text, /elena@vance.test/);
  assert.match(fieldsBlock.fields![4].text, /88\/100/);

  // Action button check
  const actionBlock = payload.blocks![3];
  assert.equal(actionBlock.type, "actions");
  assert.equal(actionBlock.elements![0].url, "https://crm.test/w/northstar-studio/leads/lead-123");
});

test("sendSlackWebhook dispatches HTTP POST request with payload", async () => {
  let capturedUrl = "";
  let capturedOptions: any = null;

  const mockFetch = async (url: string | URL | Request, options?: RequestInit) => {
    capturedUrl = String(url);
    capturedOptions = options;
    return new Response("ok", { status: 200 });
  };

  const result = await sendSlackWebhook(
    "https://hooks.slack.com/services/test/webhook",
    { text: "Test alert message" },
    mockFetch as any
  );

  assert.equal(result.success, true);
  assert.equal(result.statusCode, 200);
  assert.equal(capturedUrl, "https://hooks.slack.com/services/test/webhook");
  assert.equal(capturedOptions.method, "POST");
  assert.equal(capturedOptions.headers["Content-Type"], "application/json");
  assert.match(capturedOptions.body, /Test alert message/);
});

test("sendSlackWebhook handles HTTP error response gracefully", async () => {
  const mockFetch = async () => {
    return new Response("invalid_payload", { status: 400 });
  };

  const result = await sendSlackWebhook(
    "https://hooks.slack.com/services/test/webhook",
    { text: "Test message" },
    mockFetch as any
  );

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 400);
  assert.match(result.error!, /Slack webhook returned HTTP 400/);
});

test("sendSlackWebhook returns error when webhook URL is empty", async () => {
  const result = await sendSlackWebhook("", { text: "Test" });
  assert.equal(result.success, false);
  assert.match(result.error!, /Missing Slack Webhook URL/);
});

test("evaluateWorkflowRules triggers SEND_SLACK_ALERT for high score criteria", () => {
  const rules: WorkflowRule[] = [
    {
      id: "rule_slack",
      tenantId: "tenant-1",
      name: "Send Slack Alert when Score >= 75",
      trigger: "ON_HIGH_SCORE",
      minScore: 75,
      action: "SEND_SLACK_ALERT",
      actionPayload: { channel: "#hot-leads" },
      enabled: true,
    },
  ];

  const context = {
    leadId: "lead-99",
    tenantId: "tenant-1",
    stage: LeadStage.QUALIFIED,
    score: 85,
    priority: LeadPriority.HIGH,
  };

  const triggered = evaluateWorkflowRules(rules, context, "ON_HIGH_SCORE");

  assert.equal(triggered.length, 1);
  assert.equal(triggered[0].action, "SEND_SLACK_ALERT");
  assert.equal(triggered[0].ruleId, "rule_slack");
});
