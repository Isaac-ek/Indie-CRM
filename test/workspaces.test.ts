import test from "node:test";
import assert from "node:assert/strict";
import { MembershipRole } from "@/generated/prisma/client";
import {
  canContributeToLead,
  canManageLeadRecords,
  canManageWorkspace,
  requireWorkspacePermission,
  WorkspaceContext,
} from "@/lib/workspaces";

const mockWorkspace = (role: MembershipRole): WorkspaceContext => ({
  id: "tenant-1",
  slug: "northstar-studio",
  name: "Northstar Studio",
  mode: "database",
  currentUser: {
    id: "user-1",
    email: "user@test.com",
    name: "Test User",
  },
  membershipRole: role,
  availableWorkspaces: [],
});

test("evaluates role capabilities via workspaces module", () => {
  assert.equal(canManageWorkspace(MembershipRole.OWNER), true);
  assert.equal(canManageWorkspace(MembershipRole.ADMIN), true);
  assert.equal(canManageWorkspace(MembershipRole.MEMBER), false);

  assert.equal(canManageLeadRecords(MembershipRole.MEMBER), true);
  assert.equal(canContributeToLead(MembershipRole.MEMBER), true);
});

test("requireWorkspacePermission validates workspace role correctly", () => {
  const memberWs = mockWorkspace(MembershipRole.MEMBER);
  const ownerWs = mockWorkspace(MembershipRole.OWNER);

  assert.doesNotThrow(() => requireWorkspacePermission(memberWs, "leads:read"));
  assert.doesNotThrow(() => requireWorkspacePermission(memberWs, "leads:write"));
  assert.throws(
    () => requireWorkspacePermission(memberWs, "members:manage"),
    /Forbidden: Role 'MEMBER' lacks permission 'members:manage'/,
  );

  assert.doesNotThrow(() => requireWorkspacePermission(ownerWs, "members:manage"));
  assert.doesNotThrow(() => requireWorkspacePermission(ownerWs, "integrations:manage"));
});
