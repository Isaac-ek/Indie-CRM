import test from "node:test";
import assert from "node:assert/strict";
import { MembershipRole } from "@/generated/prisma/client";
import { canManageTargetRole, requireManageTargetRole, hasPermission } from "@/lib/rbac";
import { canDeleteLeads, canManageOwners } from "@/lib/workspaces";
import {
  validatePasswordStrength,
  requiredInteger,
  optionalUrl,
  sanitizeInputString,
} from "@/lib/validation";

test("role hierarchy: OWNER can manage all roles", () => {
  assert.equal(canManageTargetRole(MembershipRole.OWNER, MembershipRole.OWNER), true);
  assert.equal(canManageTargetRole(MembershipRole.OWNER, MembershipRole.ADMIN), true);
  assert.equal(canManageTargetRole(MembershipRole.OWNER, MembershipRole.MEMBER), true);
});

test("role hierarchy: ADMIN cannot manage OWNER", () => {
  assert.equal(canManageTargetRole(MembershipRole.ADMIN, MembershipRole.OWNER), false);
  assert.equal(canManageTargetRole(MembershipRole.ADMIN, MembershipRole.ADMIN), true);
  assert.equal(canManageTargetRole(MembershipRole.ADMIN, MembershipRole.MEMBER), true);
  assert.throws(
    () => requireManageTargetRole(MembershipRole.ADMIN, MembershipRole.OWNER),
    /Forbidden: Role 'ADMIN' cannot modify or remove an 'OWNER'/,
  );
});

test("role hierarchy: MEMBER cannot manage any target role", () => {
  assert.equal(canManageTargetRole(MembershipRole.MEMBER, MembershipRole.OWNER), false);
  assert.equal(canManageTargetRole(MembershipRole.MEMBER, MembershipRole.ADMIN), false);
  assert.equal(canManageTargetRole(MembershipRole.MEMBER, MembershipRole.MEMBER), false);
});

test("permissions: leads:delete capability", () => {
  assert.equal(canDeleteLeads(MembershipRole.OWNER), true);
  assert.equal(canDeleteLeads(MembershipRole.ADMIN), true);
  assert.equal(canDeleteLeads(MembershipRole.MEMBER), false);
});

test("permissions: owners:manage capability", () => {
  assert.equal(canManageOwners(MembershipRole.OWNER), true);
  assert.equal(canManageOwners(MembershipRole.ADMIN), false);
  assert.equal(canManageOwners(MembershipRole.MEMBER), false);
});

test("validation: password strength checks", () => {
  assert.equal(validatePasswordStrength("short").valid, false);
  assert.equal(validatePasswordStrength("password123").valid, true);
  assert.equal(validatePasswordStrength("").valid, false);
});

test("validation: required integer parsing and range enforcement", () => {
  const formData = new FormData();
  formData.set("limit", "25");

  assert.equal(requiredInteger(formData, "limit", { min: 1, max: 100 }), 25);

  formData.set("limit", "0");
  assert.throws(() => requiredInteger(formData, "limit", { min: 1 }), /limit must be at least 1/);
});

test("validation: optional URL parsing", () => {
  const formData = new FormData();
  formData.set("website", "https://example.com/api");

  assert.equal(optionalUrl(formData, "website"), "https://example.com/api");

  formData.set("website", "ftp://invalid-scheme");
  assert.throws(() => optionalUrl(formData, "website"), /website must be a valid HTTP or HTTPS URL/);
});

test("validation: sanitizes input string control characters", () => {
  const untrusted = "Hello\x00World\x07!";
  assert.equal(sanitizeInputString(untrusted), "HelloWorld!");
});
