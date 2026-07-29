import assert from "node:assert/strict";
import { test } from "node:test";
import {
  generateWebhookSignature,
  verifyWebhookSignature,
} from "../src/lib/webhook-signature";

test("generates valid HMAC-SHA256 signature prefixed with sha256=", () => {
  const payload = JSON.stringify({ event: "lead.created", id: "lead_123" });
  const secret = "whsec_test_secret_key";
  const signature = generateWebhookSignature(payload, secret);

  assert.ok(signature.startsWith("sha256="));
  assert.equal(signature.length, 7 + 64); // "sha256=" (7 chars) + 64 hex chars
});

test("verifies valid HMAC-SHA256 signatures correctly", () => {
  const payload = JSON.stringify({ name: "Jane Doe", email: "jane@test.com" });
  const secret = "whsec_super_secret_123";
  const signature = generateWebhookSignature(payload, secret);

  const isValid = verifyWebhookSignature(payload, signature, secret);
  assert.equal(isValid, true);
});

test("rejects forged or modified payload signatures", () => {
  const payload = JSON.stringify({ name: "Jane Doe", email: "jane@test.com" });
  const forgedPayload = JSON.stringify({ name: "Jane Doe", email: "attacker@test.com" });
  const secret = "whsec_super_secret_123";
  const signature = generateWebhookSignature(payload, secret);

  const isValid = verifyWebhookSignature(forgedPayload, signature, secret);
  assert.equal(isValid, false);
});

test("returns false for missing header or empty secret", () => {
  const payload = "hello world";
  assert.equal(verifyWebhookSignature(payload, null, "secret"), false);
  assert.equal(verifyWebhookSignature(payload, "sha256=123", ""), false);
  assert.equal(verifyWebhookSignature("", "sha256=123", "secret"), false);
});
