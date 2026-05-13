"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { backfillMessageEmbeddings, backfillNoteEmbeddings } from "@/lib/ai";
import { createAuditLog } from "@/lib/audit";
import { MailProvider, MembershipRole, WorkspaceInviteStatus } from "@/generated/prisma/client";
import { AuditLogAction } from "@/generated/prisma/client";
import { getCurrentUserContext } from "@/lib/auth";
import { syncWorkspaceGmailInbox } from "@/lib/gmail-sync";
import { getPrismaClient } from "@/lib/prisma";
import {
  optionalTrimmedString,
  requiredEmail,
  requiredEnumValue,
  requiredToken,
  requiredTrimmedString,
} from "@/lib/validation";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/workspaces";
import { processPendingWebhookEvents } from "@/lib/webhook-ingestion";

function parseMembershipRole(value: string): MembershipRole {
  switch (value) {
    case MembershipRole.OWNER:
      return MembershipRole.OWNER;
    case MembershipRole.ADMIN:
      return MembershipRole.ADMIN;
    case MembershipRole.MEMBER:
      return MembershipRole.MEMBER;
    default:
      throw new Error("Invalid membership role.");
  }
}

async function requireManageMembersWorkspace(workspaceSlug: string) {
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id || !canManageWorkspace(workspace.membershipRole)) {
    redirect(`/w/${workspaceSlug}/settings?memberError=permissions`);
  }

  return workspace;
}

function revalidateWorkspaceMembershipPaths(workspaceSlug: string) {
  revalidatePath("/");
  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/settings`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function rethrowIfRedirect(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

function redirectSettingsError(workspaceSlug: string, error: unknown) {
  redirect(`/w/${workspaceSlug}/settings?settingsError=${encodeURIComponent(getErrorMessage(error))}`);
}

export async function processWebhookQueueAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const workspace = await requireManageMembersWorkspace(workspaceSlug);
  const tenantId = workspace.id!;

  const result = await processPendingWebhookEvents({
    tenantId,
    limit: 20,
  });

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/leads`);
  revalidatePath(`/w/${workspaceSlug}/settings`);

  await createAuditLog({
    tenantId,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.WEBHOOK_QUEUE_PROCESSED,
    targetType: "webhook_queue",
    summary: "Processed webhook queue from settings",
    metadata: result,
  });

  redirect(
    `/w/${workspaceSlug}/settings?webhookProcessed=${result.processed}&webhookFailed=${result.failed}`,
  );
}

export async function inviteWorkspaceMemberAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  let email = "";
  let role: MembershipRole = MembershipRole.MEMBER;

  try {
    email = requiredEmail(formData, "email");
    role = parseMembershipRole(
      requiredEnumValue(formData, "role", [
        MembershipRole.OWNER,
        MembershipRole.ADMIN,
        MembershipRole.MEMBER,
      ]),
    );
  } catch (error) {
    redirectSettingsError(workspaceSlug, error);
  }

  const workspace = await requireManageMembersWorkspace(workspaceSlug);
  const currentUser = await getCurrentUserContext();
  const prisma = getPrismaClient();

  const existingMembership = await prisma.membership.findFirst({
    where: {
      tenantId: workspace.id!,
      user: {
        email,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingMembership) {
    redirect(`/w/${workspaceSlug}/settings?memberError=already_member`);
  }

  const existingInvite = await prisma.workspaceInvite.findFirst({
    where: {
      tenantId: workspace.id!,
      email,
      status: WorkspaceInviteStatus.PENDING,
    },
    select: {
      id: true,
    },
  });

  if (existingInvite) {
    redirect(`/w/${workspaceSlug}/settings?memberError=invite_exists`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    await prisma.membership.create({
      data: {
        tenantId: workspace.id!,
        userId: existingUser.id,
        role,
      },
    });

    await createAuditLog({
      tenantId: workspace.id!,
      actorUserId: currentUser.id,
      action: AuditLogAction.MEMBER_INVITED,
      targetType: "membership",
      targetId: existingUser.id,
      summary: `Added existing user ${email} to workspace`,
      metadata: {
        role,
      },
    });

    revalidateWorkspaceMembershipPaths(workspaceSlug);
    redirect(`/w/${workspaceSlug}/settings?memberInvited=joined`);
  }

  await prisma.workspaceInvite.create({
    data: {
      tenantId: workspace.id!,
      email,
      role,
      invitedById: currentUser.id,
      token: randomUUID(),
    },
  });

  await createAuditLog({
    tenantId: workspace.id!,
    actorUserId: currentUser.id,
    action: AuditLogAction.MEMBER_INVITED,
    targetType: "workspace_invite",
    summary: `Created invite for ${email}`,
    metadata: {
      email,
      role,
    },
  });

  revalidateWorkspaceMembershipPaths(workspaceSlug);
  redirect(`/w/${workspaceSlug}/settings?memberInvited=pending`);
}

export async function updateWorkspaceMemberRoleAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  let membershipId = "";
  let role: MembershipRole = MembershipRole.MEMBER;

  try {
    membershipId = requiredTrimmedString(formData, "membershipId", { maxLength: 64 });
    role = parseMembershipRole(
      requiredEnumValue(formData, "role", [
        MembershipRole.OWNER,
        MembershipRole.ADMIN,
        MembershipRole.MEMBER,
      ]),
    );
  } catch (error) {
    redirectSettingsError(workspaceSlug, error);
  }

  const workspace = await requireManageMembersWorkspace(workspaceSlug);
  const prisma = getPrismaClient();

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      tenantId: workspace.id!,
    },
    select: {
      id: true,
      role: true,
      userId: true,
    },
  });

  if (!membership) {
    redirect(`/w/${workspaceSlug}/settings?memberError=missing`);
  }

  const ownerCount = await prisma.membership.count({
    where: {
      tenantId: workspace.id!,
      role: MembershipRole.OWNER,
    },
  });

  if (membership.role === MembershipRole.OWNER && role !== MembershipRole.OWNER && ownerCount <= 1) {
    redirect(`/w/${workspaceSlug}/settings?memberError=last_owner`);
  }

  await prisma.membership.update({
    where: {
      id: membership.id,
    },
    data: {
      role,
    },
  });

  await createAuditLog({
    tenantId: workspace.id!,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.MEMBER_ROLE_UPDATED,
    targetType: "membership",
    targetId: membership.id,
    summary: "Updated workspace member role",
    metadata: {
      role,
    },
  });

  revalidateWorkspaceMembershipPaths(workspaceSlug);
  redirect(`/w/${workspaceSlug}/settings?memberUpdated=1`);
}

export async function revokeWorkspaceInviteAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  let inviteId = "";

  try {
    inviteId = requiredTrimmedString(formData, "inviteId", { maxLength: 64 });
  } catch (error) {
    redirectSettingsError(workspaceSlug, error);
  }

  const workspace = await requireManageMembersWorkspace(workspaceSlug);
  const prisma = getPrismaClient();

  await prisma.workspaceInvite.updateMany({
    where: {
      id: inviteId,
      tenantId: workspace.id!,
      status: WorkspaceInviteStatus.PENDING,
    },
    data: {
      status: WorkspaceInviteStatus.REVOKED,
    },
  });

  await createAuditLog({
    tenantId: workspace.id!,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.INVITE_REVOKED,
    targetType: "workspace_invite",
    targetId: inviteId,
    summary: "Revoked pending workspace invite",
  });

  revalidateWorkspaceMembershipPaths(workspaceSlug);
  redirect(`/w/${workspaceSlug}/settings?inviteRevoked=1`);
}

export async function acceptWorkspaceInviteAction(formData: FormData) {
  const token = requiredToken(formData, "token");
  const currentUser = await getCurrentUserContext();

  if (currentUser.mode !== "database" || !currentUser.id) {
    redirect("/login");
  }

  const prisma = getPrismaClient();
  const invite = await prisma.workspaceInvite.findUnique({
    where: {
      token,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      tenantId: true,
      tenant: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!invite || invite.status !== WorkspaceInviteStatus.PENDING) {
    redirect("/?inviteError=invalid");
  }

  if (invite.email !== currentUser.email.toLowerCase()) {
    redirect(`/invite/${token}?error=email_mismatch`);
  }

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: invite.tenantId,
        userId: currentUser.id,
      },
    },
    update: {
      role: invite.role,
    },
    create: {
      tenantId: invite.tenantId,
      userId: currentUser.id,
      role: invite.role,
    },
  });

  await prisma.workspaceInvite.update({
    where: {
      id: invite.id,
    },
    data: {
      status: WorkspaceInviteStatus.ACCEPTED,
      acceptedAt: new Date(),
    },
  });

  await createAuditLog({
    tenantId: invite.tenantId,
    actorUserId: currentUser.id,
    action: AuditLogAction.INVITE_ACCEPTED,
    targetType: "workspace_invite",
    targetId: invite.id,
    summary: "Accepted workspace invite",
  });

  revalidateWorkspaceMembershipPaths(invite.tenant.slug);
  redirect(`/w/${invite.tenant.slug}?inviteAccepted=1`);
}

export async function backfillEmbeddingsAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const workspace = await requireManageMembersWorkspace(workspaceSlug);
  const tenantId = workspace.id!;

  try {
    const messageResult = await backfillMessageEmbeddings({
      tenantId,
      limit: 100,
    });
    const noteResult = await backfillNoteEmbeddings({
      tenantId,
      limit: 100,
    });

    revalidatePath(`/w/${workspaceSlug}/search`);
    revalidatePath(`/w/${workspaceSlug}/settings`);

    redirect(
      `/w/${workspaceSlug}/settings?embeddingsBackfilled=${messageResult.processed + noteResult.processed}`,
    );
  } catch (error) {
    rethrowIfRedirect(error);
    redirectSettingsError(workspaceSlug, error);
  }
}

export async function saveAIInstructionsAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  let instructions: string | null = null;

  try {
    instructions = optionalTrimmedString(formData, "aiInstructions", { maxLength: 4000 });
  } catch (error) {
    redirectSettingsError(workspaceSlug, error);
  }

  const workspace = await requireManageMembersWorkspace(workspaceSlug);
  const prisma = getPrismaClient();

  await prisma.tenant.update({
    where: {
      id: workspace.id!,
    },
    data: {
      aiInstructions:
        instructions ?? null,
    },
  });

  await createAuditLog({
    tenantId: workspace.id!,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.AI_INSTRUCTIONS_UPDATED,
    targetType: "tenant",
    targetId: workspace.id!,
    summary: "Updated workspace AI instructions",
  });

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/settings`);
  redirect(`/w/${workspaceSlug}/settings?aiInstructionsSaved=1`);
}

export async function saveGmailConnectionAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  let email = "";
  let refreshToken = "";

  try {
    email = requiredEmail(formData, "email");
    refreshToken = requiredTrimmedString(formData, "refreshToken", { maxLength: 4096 });
  } catch (error) {
    redirectSettingsError(workspaceSlug, error);
  }

  const workspace = await requireManageMembersWorkspace(workspaceSlug);
  const prisma = getPrismaClient();

  await prisma.mailboxConnection.upsert({
    where: {
      tenantId_provider_email: {
        tenantId: workspace.id!,
        provider: MailProvider.GMAIL,
        email,
      },
    },
    update: {
      refreshToken,
      lastError: null,
    },
    create: {
      tenantId: workspace.id!,
      provider: MailProvider.GMAIL,
      email,
      refreshToken,
    },
  });

  await createAuditLog({
    tenantId: workspace.id!,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.GMAIL_CONNECTED,
    targetType: "mailbox_connection",
    summary: `Saved Gmail connection for ${email}`,
    metadata: {
      provider: MailProvider.GMAIL,
      email,
    },
  });

  revalidateWorkspaceMembershipPaths(workspaceSlug);
  redirect(`/w/${workspaceSlug}/settings?gmailConnected=1`);
}

export async function syncGmailAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const workspace = await requireManageMembersWorkspace(workspaceSlug);

  try {
    const result = await syncWorkspaceGmailInbox({
      tenantId: workspace.id!,
      requestedById: workspace.currentUser.id,
      limit: 10,
    });

    revalidatePath(`/w/${workspaceSlug}/leads`);
    revalidatePath(`/w/${workspaceSlug}/search`);
    revalidateWorkspaceMembershipPaths(workspaceSlug);

    await createAuditLog({
      tenantId: workspace.id!,
      actorUserId: workspace.currentUser.id,
      action: AuditLogAction.GMAIL_SYNCED,
      targetType: "mailbox_connection",
      summary: "Ran manual Gmail sync",
      metadata: result,
    });

    redirect(
      `/w/${workspaceSlug}/settings?gmailImported=${result.imported}&gmailSkipped=${result.skipped}`,
    );
  } catch (error) {
    rethrowIfRedirect(error);
    const message = error instanceof Error ? error.message : "gmail_sync_failed";
    redirect(`/w/${workspaceSlug}/settings?gmailError=${encodeURIComponent(message)}`);
  }
}
