import test from "node:test";
import assert from "node:assert/strict";
import { decrypt, encrypt } from "@/lib/encryption";

test("encrypts and decrypts text correctly using AES-256-GCM", () => {
  const secretText = "1//04_example_refresh_token_string_abc123xyz";
  const encrypted = encrypt(secretText);

  assert.notEqual(encrypted, secretText);
  assert.equal(encrypted.split(":").length, 3, "Output format should be iv:authTag:encrypted");

  const decrypted = decrypt(encrypted);
  assert.equal(decrypted, secretText);
});

test("falls back gracefully for legacy unencrypted text", () => {
  const legacyToken = "legacy_unencrypted_token_value";
  assert.equal(decrypt(legacyToken), legacyToken);
});

test("returns empty text for null or empty input", () => {
  assert.equal(encrypt(""), "");
  assert.equal(decrypt(""), "");
});
