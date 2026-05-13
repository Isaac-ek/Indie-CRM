import test from "node:test";
import assert from "node:assert/strict";
import { parseCsvTags, parseOptionalFollowUpDate, parseSelectedLeadIds } from "@/lib/lead-action-utils";
import { slugifyWorkspaceName } from "@/lib/workspace-slug";
import { requiredEmail, requiredTrimmedString } from "@/lib/validation";

test("slugifies workspace names for tenant creation", () => {
  assert.equal(slugifyWorkspaceName("Northstar Studio"), "northstar-studio");
  assert.equal(slugifyWorkspaceName(" Signal Lab / 2026 "), "signal-lab-2026");
  assert.equal(slugifyWorkspaceName("!!!"), "");
});

test("parses and deduplicates bulk lead ids and csv tags", () => {
  const formData = new FormData();
  formData.append("leadIds", "lead-1");
  formData.append("leadIds", "lead-2");
  formData.append("leadIds", "lead-1");
  formData.append("leadIds", "  lead-3  ");

  assert.deepEqual(parseSelectedLeadIds(formData, "leadIds"), ["lead-1", "lead-2", "lead-3"]);
  assert.deepEqual(parseCsvTags(" vip, healthcare, vip,  follow-up "), [
    "vip",
    "healthcare",
    "follow-up",
  ]);
});

test("validates and parses follow-up dates used by lead workflow actions", () => {
  const parsed = parseOptionalFollowUpDate("2026-05-05");
  assert.ok(parsed instanceof Date);
  assert.equal(parsed?.toISOString(), "2026-05-05T09:00:00.000Z");
  assert.equal(parseOptionalFollowUpDate(null), null);
  assert.throws(() => parseOptionalFollowUpDate("not-a-date"), /Invalid follow-up date/);
});

test("enforces required trimmed strings and normalized emails", () => {
  const formData = new FormData();
  formData.set("email", "  USER@Example.com ");
  formData.set("password", "  demo12345  ");

  assert.equal(requiredEmail(formData, "email"), "user@example.com");
  assert.equal(requiredTrimmedString(formData, "password", { maxLength: 20 }), "demo12345");
  assert.throws(() => requiredTrimmedString(new FormData(), "password"), /password is required/);
});
