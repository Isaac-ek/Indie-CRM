import { notFound } from "next/navigation";
import { MembershipRole, Prisma } from "@/generated/prisma/client";
import { getCurrentUserContext } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { hasPermission, PermissionKey, requirePermission } from "@/lib/rbac";

export type WorkspaceContext = {
  id: string | null;
  slug: string;
  name: string;
  mode: "database" | "demo";
  currentUser: {
    id: string | null;
    email: string;
    name: string;
  };
  membershipRole: MembershipRole;
  availableWorkspaces: {
    id: string | null;
    slug: string;
    name: string;
    membershipRole: MembershipRole;
  }[];
};

export function canManageWorkspace(role: MembershipRole) {
  return hasPermission(role, "workspace:settings");
}

export function canManageLeadRecords(role: MembershipRole) {
  return hasPermission(role, "leads:write");
}

export function canContributeToLead(role: MembershipRole) {
  return hasPermission(role, "notes:write");
}

export function requireWorkspacePermission(workspace: WorkspaceContext, permission: PermissionKey) {
  requirePermission(workspace.membershipRole, permission);
}

const demoWorkspace = {
  id: null,
  slug: "northstar-studio",
  name: "Northstar Studio",
  mode: "demo" as const,
  currentUser: {
    id: null,
    email: "owner@northstarstudio.test",
    name: "Chiemelie Ekezie",
  },
  membershipRole: MembershipRole.OWNER,
  availableWorkspaces: [
    {
      id: null,
      slug: "northstar-studio",
      name: "Northstar Studio",
      membershipRole: MembershipRole.OWNER,
    },
  ],
};

export async function getWorkspaceContext(workspaceSlug: string): Promise<WorkspaceContext> {
  if (!process.env.DATABASE_URL) {
    if (workspaceSlug !== demoWorkspace.slug) {
      notFound();
    }

    return demoWorkspace;
  }

  try {
    const currentUser = await getCurrentUserContext();
    const prisma = getPrismaClient();
    const memberships = await prisma.membership.findMany({
      where: {
        user: {
          email: currentUser.email,
        },
      },
      orderBy: [{ tenant: { name: "asc" } }],
      select: {
        role: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });
    const membership = await prisma.membership.findFirst({
      where: {
        user: {
          email: currentUser.email,
        },
        tenant: {
          slug: workspaceSlug,
        },
      },
      select: {
        role: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      notFound();
    }

    return {
      ...membership.tenant,
      mode: "database",
      membershipRole: membership.role,
      currentUser: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name ?? membership.user.email,
      },
      availableWorkspaces: memberships.map((entry) => ({
        id: entry.tenant.id,
        slug: entry.tenant.slug,
        name: entry.tenant.name,
        membershipRole: entry.role,
      })),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      if (workspaceSlug !== demoWorkspace.slug) {
        notFound();
      }

      return demoWorkspace;
    }

    throw error;
  }
}
