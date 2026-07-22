import { MembershipRole } from "@/generated/prisma/client";

export type PermissionKey =
  | "leads:read"
  | "leads:write"
  | "leads:delete"
  | "notes:write"
  | "ai:trigger"
  | "integrations:manage"
  | "members:manage"
  | "workspace:settings";

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
    throw new Error(`Forbidden: Role '${role}' lacks permission '${permission}'`);
  }
}
