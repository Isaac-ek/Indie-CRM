import test from "node:test";
import assert from "node:assert/strict";
import { MembershipRole } from "@/generated/prisma/client";
import { hasPermission, requirePermission } from "@/lib/rbac";

test("grants OWNER full permissions across all capabilities", () => {
  assert.equal(hasPermission(MembershipRole.OWNER, "leads:read"), true);
  assert.equal(hasPermission(MembershipRole.OWNER, "leads:delete"), true);
  assert.equal(hasPermission(MembershipRole.OWNER, "members:manage"), true);
  assert.equal(hasPermission(MembershipRole.OWNER, "integrations:manage"), true);
});

test("restricts MEMBER from administrative permissions", () => {
  assert.equal(hasPermission(MembershipRole.MEMBER, "leads:read"), true);
  assert.equal(hasPermission(MembershipRole.MEMBER, "leads:write"), true);
  assert.equal(hasPermission(MembershipRole.MEMBER, "notes:write"), true);
  assert.equal(hasPermission(MembershipRole.MEMBER, "ai:trigger"), true);

  assert.equal(hasPermission(MembershipRole.MEMBER, "leads:delete"), false);
  assert.equal(hasPermission(MembershipRole.MEMBER, "members:manage"), false);
  assert.equal(hasPermission(MembershipRole.MEMBER, "integrations:manage"), false);
});

test("requirePermission throws descriptive error when capability is missing", () => {
  assert.doesNotThrow(() => requirePermission(MembershipRole.OWNER, "integrations:manage"));
  assert.throws(
    () => requirePermission(MembershipRole.MEMBER, "integrations:manage"),
    /Forbidden: Role 'MEMBER' lacks permission 'integrations:manage'/,
  );
});
