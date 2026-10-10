import test from "node:test";
import assert from "node:assert/strict";
import { validateHoneypot, validateSubmissionSpeed, DEFAULT_HONEYPOT_FIELD } from "@/lib/bot-protection";
import { validateAudioUpload, MAX_AUDIO_UPLOAD_BYTES } from "@/lib/transcription";
import { securityHeaders } from "../next.config";

test("bot protection: honeypot permits legitimate users with empty field", () => {
  const formData = new FormData();
  formData.append("email", "human@example.com");
  formData.append(DEFAULT_HONEYPOT_FIELD, "");

  assert.equal(validateHoneypot(formData), true);
});

test("bot protection: honeypot permits submissions where field is omitted", () => {
  const formData = new FormData();
  formData.append("email", "human@example.com");

  assert.equal(validateHoneypot(formData), true);
});

test("bot protection: honeypot detects and rejects automated bot submissions", () => {
  const formData = new FormData();
  formData.append("email", "spammer@bot.net");
  formData.append(DEFAULT_HONEYPOT_FIELD, "http://spamsite.xyz");

  assert.equal(validateHoneypot(formData), false);
});

test("bot protection: velocity check flags impossibly fast submissions", () => {
  const now = Date.now();
  // Submitted 50ms ago (impossible for a human)
  assert.equal(validateSubmissionSpeed(now - 50, 400), false);
  // Submitted 1500ms ago (normal human)
  assert.equal(validateSubmissionSpeed(now - 1500, 400), true);
});

test("file upload restrictions: rejects missing or 0-byte audio files", () => {
  assert.deepEqual(validateAudioUpload(null), { valid: false, error: "missing_file" });
  assert.deepEqual(validateAudioUpload({ size: 0, type: "audio/mpeg" }), {
    valid: false,
    error: "missing_file",
  });
});

test("file upload restrictions: enforces 15MB file size limit", () => {
  const oversizedFile = {
    size: MAX_AUDIO_UPLOAD_BYTES + 1024,
    type: "audio/mpeg",
  };
  assert.deepEqual(validateAudioUpload(oversizedFile), {
    valid: false,
    error: "file_too_large",
  });

  const validSizeFile = {
    size: 2 * 1024 * 1024, // 2MB
    type: "audio/mpeg",
  };
  assert.deepEqual(validateAudioUpload(validSizeFile), { valid: true });
});

test("file upload restrictions: rejects non-audio or dangerous MIME types", () => {
  assert.deepEqual(
    validateAudioUpload({ size: 1024, type: "application/x-sh" }),
    { valid: false, error: "invalid_mime_type" }
  );
  assert.deepEqual(
    validateAudioUpload({ size: 1024, type: "text/html" }),
    { valid: false, error: "invalid_mime_type" }
  );
  assert.deepEqual(
    validateAudioUpload({ size: 1024, type: "image/png" }),
    { valid: false, error: "invalid_mime_type" }
  );
});

test("file upload restrictions: accepts standard audio formats", () => {
  const validFormats = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/m4a", "audio/ogg"];
  for (const type of validFormats) {
    assert.deepEqual(
      validateAudioUpload({ size: 5000, type }),
      { valid: true },
      `Expected ${type} to be valid`
    );
  }
});

test("security headers: next.config.ts contains required HTTP security headers", () => {
  const headerMap = new Map(securityHeaders.map((h) => [h.key, h.value]));

  // Force HTTPS / HSTS
  assert.ok(headerMap.has("Strict-Transport-Security"), "HSTS header must be present");
  assert.match(headerMap.get("Strict-Transport-Security")!, /max-age=\d+/);
  assert.match(headerMap.get("Strict-Transport-Security")!, /preload/);

  // Clickjacking / MIME sniffing
  assert.equal(headerMap.get("X-Frame-Options"), "DENY");
  assert.equal(headerMap.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headerMap.get("Referrer-Policy"), "strict-origin-when-cross-origin");

  // Content Security Policy & Permissions
  assert.ok(headerMap.has("Content-Security-Policy"), "CSP must be present");
  assert.ok(headerMap.has("Permissions-Policy"), "Permissions-Policy must be present");
});
