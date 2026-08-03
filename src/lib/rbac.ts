import { MembershipRole } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/errors";

export type PermissionKey =
  | "leads:read"
  | "leads:write"
  | "leads:delete"
  | "notes:write"
  | "ai:trigger"
  | "integrations:manage"
  | "members:manage"
  | "workspace:settings"
  | "owners:manage";

/**
 * Permission matrix maps roles to explicit granular capabilities.
 */
export const ROLE_PERMISSIONS: Record<MembershipRole, PermissionKey[]> = {
  OWNER: [
    "leads:read",
    "leads:write",
    "leads:delete",
    "notes:write",
    "ai:trigger",
    "integrations:manage",
    "members:manage",
    "workspace:settings",
    "owners:manage",
  ],
  ADMIN: [
    "leads:read",
    "leads:write",
    "leads:delete",
    "notes:write",
    "ai:trigger",
    "integrations:manage",
    "members:manage",
    "workspace:settings",
  ],
  MEMBER: [
    "leads:read",
    "leads:write",
    "notes:write",
    "ai:trigger",
  ],
};

/**
 * Checks whether a role possesses a specific permission key.
 */
export function hasPermission(role: MembershipRole, permission: PermissionKey): boolean {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.includes(permission);
}

/**
 * Asserts that a role possesses a specific permission key, throwing an Error if denied.
 */
export function requirePermission(role: MembershipRole, permission: PermissionKey): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(`Forbidden: Role '${role}' lacks permission '${permission}'`);
  }
}

/**
 * Checks whether an actor role can manage a target role.
 * - OWNER can manage OWNER, ADMIN, MEMBER.
 * - ADMIN can manage ADMIN, MEMBER (cannot manage OWNER).
 * - MEMBER cannot manage any roles.
 */
export function canManageTargetRole(actorRole: MembershipRole, targetRole: MembershipRole): boolean {
  if (actorRole === MembershipRole.OWNER) {
    return true;
  }
  if (actorRole === MembershipRole.ADMIN) {
    return targetRole !== MembershipRole.OWNER;
  }
  return false;
}

/**
 * Asserts that an actor role can manage a target role, throwing ForbiddenError if not allowed.
 */
export function requireManageTargetRole(actorRole: MembershipRole, targetRole: MembershipRole): void {
  if (!canManageTargetRole(actorRole, targetRole)) {
    throw new ForbiddenError(`Forbidden: Role '${actorRole}' cannot modify or remove an '${targetRole}'.`);
  }
}
