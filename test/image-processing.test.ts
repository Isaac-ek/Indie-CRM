import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  validateImageUpload,
  getDeterministicFallbackExtraction,
  extractDataFromImage,
  executeImageWorkflow,
  MAX_IMAGE_UPLOAD_BYTES,
} from "../src/lib/image-processing.js";
import { MembershipRole } from "../src/generated/prisma/client.js";
import { WorkspaceContext } from "../src/lib/workspaces.js";

const mockWorkspaceContext: WorkspaceContext = {
  mode: "demo",
  id: "workspace-demo-123",
  slug: "demo-workspace",
  name: "Demo Studio",
  membershipRole: MembershipRole.OWNER,
  currentUser: {
    id: "user-123",
    email: "operator@indiecrm.test",
    name: "Alex Solo",
  },
  availableWorkspaces: [
    {
      id: "workspace-demo-123",
      slug: "demo-workspace",
      name: "Demo Studio",
      membershipRole: MembershipRole.OWNER,
    },
  ],
};

test("image validation: rejects empty or 0-byte image files", () => {
  const result = validateImageUpload({ size: 0, type: "image/jpeg", name: "empty.jpg" });
  assert.equal(result.valid, false);
  assert.equal(result.error, "missing_file");
});

test("image validation: enforces 10MB maximum file size limit", () => {
  const oversizedResult = validateImageUpload({
    size: MAX_IMAGE_UPLOAD_BYTES + 1,
    type: "image/png",
    name: "huge.png",
  });
  assert.equal(oversizedResult.valid, false);
  assert.equal(oversizedResult.error, "file_too_large");

  const validSizeResult = validateImageUpload({
    size: 5 * 1024 * 1024,
    type: "image/png",
    name: "normal.png",
  });
  assert.equal(validSizeResult.valid, true);
});

test("image validation: rejects unsupported or dangerous MIME types", () => {
  const invalidResult = validateImageUpload({
    size: 1024,
    type: "application/pdf",
    name: "document.pdf",
  });
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.error, "invalid_mime_type");

  const executableResult = validateImageUpload({
    size: 1024,
    type: "application/x-sh",
    name: "script.sh",
  });
  assert.equal(executableResult.valid, false);
  assert.equal(executableResult.error, "invalid_mime_type");
});

test("image validation: computes SHA-256 checksum for image integrity", () => {
  const sampleBuffer = Buffer.from("fake-image-bytes-sample-123");
  const expectedHash = crypto.createHash("sha256").update(sampleBuffer).digest("hex");

  const result = validateImageUpload(
    { size: sampleBuffer.length, type: "image/jpeg", name: "photo.jpg" },
    sampleBuffer
  );

  assert.equal(result.valid, true);
  assert.equal(result.checksum, expectedHash);
});

test("deterministic extraction: extracts structured data for business card preset", () => {
  const extraction = getDeterministicFallbackExtraction(
    "sarah_business_card.jpg",
    1024 * 50,
    "image/jpeg",
    "hash_123"
  );

  assert.equal(extraction.classification.imageType, "BUSINESS_CARD");
  assert.equal(extraction.contact.name, "Sarah Jenkins");
  assert.equal(extraction.contact.email, "sarah.jenkins@luminarybrand.test");
  assert.equal(extraction.contact.company, "Luminary Creative Studio");
  assert.equal(extraction.lead.priority, "HIGH");
  assert.ok(extraction.classification.confidence >= 0.9);
  assert.ok(extraction.classification.rawOcrText.includes("LUMINARY CREATIVE STUDIO"));
});

test("deterministic extraction: extracts structured data for whiteboard session", () => {
  const extraction = getDeterministicFallbackExtraction(
    "q3_whiteboard_brainstorm.png",
    1024 * 120,
    "image/png",
    "hash_456"
  );

  assert.equal(extraction.classification.imageType, "WHITEBOARD_NOTE");
  assert.equal(extraction.contact.name, "Alex Rivera");
  assert.equal(extraction.contact.email, "alex.rivera@hypergrowth-labs.test");
  assert.equal(extraction.lead.estimatedValue, "$18,500");
  assert.ok(extraction.lead.suggestedTags.includes("whiteboard"));
});

test("deterministic extraction: extracts structured data for conference badge", () => {
  const extraction = getDeterministicFallbackExtraction(
    "marcus_health_badge.jpg",
    1024 * 80,
    "image/jpeg",
    "hash_789"
  );

  assert.equal(extraction.classification.imageType, "DOCUMENT_FORM");
  assert.equal(extraction.contact.name, "Dr. Marcus Vance");
  assert.equal(extraction.lead.priority, "URGENT");
  assert.equal(extraction.lead.estimatedValue, "$32,000");
  assert.equal(extraction.lead.followUpDays, 1);
});

test("extractDataFromImage: handles image buffer offline fallback gracefully", async () => {
  const sampleBuffer = Buffer.from("simulated_png_data");
  const extraction = await extractDataFromImage({
    buffer: sampleBuffer,
    fileName: "meeting_whiteboard.png",
    mimeType: "image/png",
  });

  assert.ok(extraction);
  assert.equal(extraction.classification.imageType, "WHITEBOARD_NOTE");
  assert.equal(extraction.contact.company, "HyperGrowth Labs");
  assert.ok(extraction.metadata.checksum.length > 0);
});

test("executeImageWorkflow: executes end-to-end CRM lead ingestion with scoring and workflow evaluation", async () => {
  const extraction = getDeterministicFallbackExtraction(
    "sarah_business_card.jpg",
    1024 * 50,
    "image/jpeg",
    "hash_workflow_test"
  );

  const workflowResult = await executeImageWorkflow({
    workspace: mockWorkspaceContext,
    extraction,
    workflowRules: [
      {
        id: "rule_high_score",
        tenantId: "workspace-demo-123",
        name: "Alert on high score",
        trigger: "ON_LEAD_CREATED",
        minScore: 30,
        action: "SEND_SLACK_ALERT",
        actionPayload: { webhookUrl: "https://hooks.slack.com/mock" },
        enabled: true,
      },
    ],
  });

  assert.equal(workflowResult.success, true);
  assert.ok(workflowResult.leadId);
  assert.ok(workflowResult.contactId);
  assert.ok(workflowResult.noteId);
  assert.ok(workflowResult.score > 0);
  assert.equal(workflowResult.extraction.contact.name, "Sarah Jenkins");
  // Check triggered actions
  assert.ok(workflowResult.triggeredActions.length > 0);
  assert.equal(workflowResult.triggeredActions[0].action, "SEND_SLACK_ALERT");
});
