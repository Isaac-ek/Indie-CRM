"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeadPriority, LeadSource, LeadStage, Prisma } from "@/generated/prisma/client";
import {
  generateFollowUpRecommendation,
  generateLeadIntelligence,
  generateReplySuggestion,
  upsertNoteEmbedding,
  upsertMessageEmbedding,
} from "@/lib/ai";
import { createAuditLog } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";
import {
  optionalTrimmedString,
  requiredEmail,
  requiredEnumValue,
  requiredTrimmedString,
} from "@/lib/validation";
import {
  parseCsvTags,
  parseOptionalFollowUpDate,
  parseSelectedLeadIds,
} from "@/lib/lead-action-utils";
import { canContributeToLead, canManageLeadRecords, getWorkspaceContext } from "@/lib/workspaces";
import { AuditLogAction } from "@/generated/prisma/client";

function parseLeadStage(value: string) {
  switch (value) {
    case "New":
      return LeadStage.NEW;
    case "Qualified":
      return LeadStage.QUALIFIED;
    case "Proposal":
      return LeadStage.PROPOSAL;
    case "Follow-up":
      return LeadStage.FOLLOW_UP;
    case "Won":
      return LeadStage.WON;
    case "Lost":
      return LeadStage.LOST;
    default:
      throw new Error("Invalid lead stage.");
  }
}

function parseLeadSource(value: string) {
  switch (value) {
    case "MANUAL":
      return LeadSource.MANUAL;
    case "FORM":
      return LeadSource.FORM;
    case "EMAIL":
      return LeadSource.EMAIL;
    case "REFERRAL":
      return LeadSource.REFERRAL;
    case "IMPORT":
      return LeadSource.IMPORT;
    default:
      throw new Error("Invalid lead source.");
  }
}

function parseLeadPriority(value: string) {
  switch (value) {
    case "LOW":
      return LeadPriority.LOW;
    case "MEDIUM":
      return LeadPriority.MEDIUM;
    case "HIGH":
      return LeadPriority.HIGH;
    case "URGENT":
      return LeadPriority.URGENT;
    default:
      throw new Error("Invalid lead priority.");
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function revalidateLeadPaths(workspaceSlug: string, leadId?: string) {
  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/leads`);
  revalidatePath(`/w/${workspaceSlug}/search`);

  if (leadId) {
    revalidatePath(`/w/${workspaceSlug}/leads/${leadId}`);
  }
}

function redirectLeadPermissionsError(workspaceSlug: string, leadId: string | null, reason: string) {
  const path = leadId ? `/w/${workspaceSlug}/leads/${leadId}` : `/w/${workspaceSlug}/leads`;
  redirect(`${path}?permissionError=${encodeURIComponent(reason)}`);
}

function redirectLeadError(workspaceSlug: string, leadId: string | null, error: string) {
  const path = leadId ? `/w/${workspaceSlug}/leads/${leadId}` : `/w/${workspaceSlug}/leads`;
  redirect(`${path}?dangerError=${encodeURIComponent(error)}`);
}

export async function createLeadAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads?created=demo`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, null, "create");
  }

  const name = requiredTrimmedString(formData, "name", { maxLength: 120 });
  const email = requiredEmail(formData, "email");
  const company = optionalTrimmedString(formData, "company", { maxLength: 120 });
  const title = optionalTrimmedString(formData, "title", { maxLength: 160 });
  const inquiry = requiredTrimmedString(formData, "inquiry", { maxLength: 5000 });
  const source = parseLeadSource(
    requiredEnumValue(formData, "source", ["MANUAL", "FORM", "EMAIL", "REFERRAL", "IMPORT"]),
  );
  const priority = parseLeadPriority(
    requiredEnumValue(formData, "priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]),
  );

  const prisma = getPrismaClient();

  const contact = await prisma.contact.upsert({
    where: {
      tenantId_email: {
        tenantId: workspace.id,
        email,
      },
    },
    update: {
      name,
      company,
    },
    create: {
      tenantId: workspace.id,
      email,
      name,
      company,
    },
  });

  const lead = await prisma.lead.create({
    data: {
      tenantId: workspace.id,
      contactId: contact.id,
      createdById: workspace.currentUser.id,
      title: title ?? (company ? `${company} inquiry` : `${name} inquiry`),
      source,
      priority,
      stage: LeadStage.NEW,
      summary: inquiry,
      followUpAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      lastContactAt: new Date(),
    },
  });

  const conversation = await prisma.conversation.create({
    data: {
      tenantId: workspace.id,
      contactId: contact.id,
      leadId: lead.id,
      subject: lead.title,
      channel: "manual",
      lastMessageAt: new Date(),
    },
  });

  const message = await prisma.message.create({
    data: {
      tenantId: workspace.id,
      conversationId: conversation.id,
      direction: "INBOUND",
      content: inquiry,
    },
  });

  await upsertMessageEmbedding({
    tenantId: workspace.id,
    messageId: message.id,
    content: inquiry,
  });

  await generateLeadIntelligence({
    tenantId: workspace.id,
    leadId: lead.id,
    requestedById: workspace.currentUser.id,
    contactName: name,
    company,
    inquiry,
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.LEAD_CREATED,
    targetType: "lead",
    targetId: lead.id,
    summary: `Created lead ${lead.title}`,
    metadata: {
      source,
      priority,
      contactEmail: email,
    },
  });

  revalidateLeadPaths(workspaceSlug);
  redirect(`/w/${workspaceSlug}/leads?created=1`);
}

export async function addLeadNoteAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const content = requiredTrimmedString(formData, "content", { maxLength: 4000 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?noteCreated=demo`);
  }

  if (!canContributeToLead(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "contribute");
  }

  const prisma = getPrismaClient();

  const note = await prisma.note.create({
    data: {
      tenantId: workspace.id,
      leadId,
      authorId: workspace.currentUser.id,
      content,
    },
  });

  await upsertNoteEmbedding({
    tenantId: workspace.id,
    noteId: note.id,
    content,
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.NOTE_CREATED,
    targetType: "lead",
    targetId: leadId,
    summary: "Added note to lead",
    metadata: {
      noteId: note.id,
    },
  });

  revalidateLeadPaths(workspaceSlug, leadId);
  redirect(`/w/${workspaceSlug}/leads/${leadId}?noteCreated=1`);
}

export async function updateLeadWorkflowAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const stage = parseLeadStage(
    requiredEnumValue(formData, "stage", ["New", "Qualified", "Proposal", "Follow-up", "Won", "Lost"]),
  );
  const source = parseLeadSource(
    requiredEnumValue(formData, "source", ["MANUAL", "FORM", "EMAIL", "REFERRAL", "IMPORT"]),
  );
  const priority = parseLeadPriority(
    requiredEnumValue(formData, "priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]),
  );
  const followUpDate = parseOptionalFollowUpDate(optionalTrimmedString(formData, "followUpDate", { maxLength: 20 }));
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?workflowUpdated=demo`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "workflow");
  }

  const prisma = getPrismaClient();

  await prisma.lead.updateMany({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    data: {
      stage,
      source,
      priority,
      followUpAt: followUpDate,
    },
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.LEAD_WORKFLOW_UPDATED,
    targetType: "lead",
    targetId: leadId,
    summary: "Updated lead workflow",
    metadata: {
      stage,
      source,
      priority,
      followUpAt: followUpDate?.toISOString() ?? null,
    },
  });

  revalidateLeadPaths(workspaceSlug, leadId);
  redirect(`/w/${workspaceSlug}/leads/${leadId}?workflowUpdated=1`);
}

export async function quickUpdateLeadAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const action = requiredTrimmedString(formData, "action", { maxLength: 40 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads?quickUpdated=demo`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "workflow");
  }

  const prisma = getPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    select: {
      id: true,
      stage: true,
    },
  });

  if (!lead) {
    redirect(`/w/${workspaceSlug}/leads`);
  }

  const now = new Date();
  const nextStageByCurrent: Record<LeadStage, LeadStage> = {
    NEW: LeadStage.QUALIFIED,
    QUALIFIED: LeadStage.PROPOSAL,
    PROPOSAL: LeadStage.FOLLOW_UP,
    FOLLOW_UP: LeadStage.WON,
    WON: LeadStage.WON,
    LOST: LeadStage.LOST,
  };

  let data: { stage?: LeadStage; followUpAt?: Date | null; lastContactAt?: Date } = {};

  switch (action) {
    case "advance":
      data = {
        stage: nextStageByCurrent[lead.stage],
      };
      break;
    case "won":
      data = {
        stage: LeadStage.WON,
      };
      break;
    case "tomorrow":
      data = {
        stage: lead.stage === LeadStage.NEW ? LeadStage.FOLLOW_UP : lead.stage,
        followUpAt: addDays(now, 1),
      };
      break;
    case "set-stage":
      data = {
        stage: parseLeadStage(
          requiredEnumValue(formData, "stage", [
            "New",
            "Qualified",
            "Proposal",
            "Follow-up",
            "Won",
            "Lost",
          ]),
        ),
      };
      break;
    case "set-follow-up":
      data = {
        followUpAt: parseOptionalFollowUpDate(
          requiredTrimmedString(formData, "followUpDate", { maxLength: 20 }),
        ),
      };
      break;
    default:
      throw new Error("Invalid quick lead action.");
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data,
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.LEAD_WORKFLOW_UPDATED,
    targetType: "lead",
    targetId: lead.id,
    summary: `Ran quick lead action: ${action}`,
    metadata: data as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
  });

  revalidateLeadPaths(workspaceSlug, leadId);
  redirect(`/w/${workspaceSlug}/leads?quickUpdated=1`);
}

export async function updateLeadIntelligenceAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const summary = requiredTrimmedString(formData, "summary", { maxLength: 2000 });
  const nextAction = requiredTrimmedString(formData, "nextAction", { maxLength: 1000 });
  const tags = Array.from(
    new Set([
      ...parseCsvTags(optionalTrimmedString(formData, "tags", { maxLength: 1000 })),
      ...parseCsvTags(optionalTrimmedString(formData, "suggestedTag", { maxLength: 120 })),
      ...parseCsvTags(optionalTrimmedString(formData, "customTag", { maxLength: 120 })),
    ]),
  );
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?intelligenceUpdated=demo`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "intelligence");
  }

  const tenantId = workspace.id;
  const prisma = getPrismaClient();

  await prisma.$transaction(async (tx) => {
    await tx.lead.updateMany({
      where: {
        id: leadId,
        tenantId,
      },
      data: {
        summary,
        nextAction,
      },
    });

    await tx.leadTag.deleteMany({
      where: {
        leadId,
      },
    });

    for (const tagName of tags) {
      const tag = await tx.tag.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: tagName,
          },
        },
        update: {},
        create: {
          tenantId,
          name: tagName,
        },
      });

      await tx.leadTag.create({
        data: {
          leadId,
          tagId: tag.id,
          assignedBy: workspace.currentUser.id ?? undefined,
        },
      });
    }
  });

  await createAuditLog({
    tenantId: tenantId,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.LEAD_INTELLIGENCE_UPDATED,
    targetType: "lead",
    targetId: leadId,
    summary: "Updated lead intelligence",
    metadata: {
      summary,
      nextAction,
      tags,
    },
  });

  revalidateLeadPaths(workspaceSlug, leadId);
  redirect(`/w/${workspaceSlug}/leads/${leadId}?intelligenceUpdated=1`);
}

export async function updateLeadProfileAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const title = requiredTrimmedString(formData, "title", { maxLength: 160 });
  const name = requiredTrimmedString(formData, "name", { maxLength: 120 });
  const email = requiredEmail(formData, "email");
  const company = optionalTrimmedString(formData, "company", { maxLength: 120 });
  const phone = optionalTrimmedString(formData, "phone", { maxLength: 40 });
  const industry = optionalTrimmedString(formData, "industry", { maxLength: 120 });
  const website = optionalTrimmedString(formData, "website", { maxLength: 255 });
  const companyNotes = optionalTrimmedString(formData, "companyNotes", { maxLength: 2000 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?profileUpdated=demo`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "profile");
  }

  const prisma = getPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    select: {
      id: true,
      title: true,
      contactId: true,
      contact: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!lead) {
    redirect(`/w/${workspaceSlug}/leads`);
  }

  const emailOwner = await prisma.contact.findFirst({
    where: {
      tenantId: workspace.id,
      email,
      id: {
        not: lead.contactId,
      },
    },
    select: {
      id: true,
    },
  });

  if (emailOwner) {
    redirectLeadError(workspaceSlug, leadId, "That email already belongs to another contact in this workspace.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: {
        id: lead.id,
      },
      data: {
        title,
      },
    });

    await tx.contact.update({
      where: {
        id: lead.contactId,
      },
      data: {
        name,
        email,
        company,
        phone,
        industry,
        website,
        companyNotes,
      },
    });
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.LEAD_INTELLIGENCE_UPDATED,
    targetType: "lead",
    targetId: lead.id,
    summary: "Updated lead profile and contact details",
    metadata: {
      title,
      email,
      company,
      phone,
      industry,
      website,
    },
  });

  revalidateLeadPaths(workspaceSlug, lead.id);
  redirect(`/w/${workspaceSlug}/leads/${lead.id}?profileUpdated=1`);
}

export async function archiveLeadAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const confirmation = requiredTrimmedString(formData, "confirmation", { maxLength: 20 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?dangerError=${encodeURIComponent("Archive requires database mode.")}`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "archive");
  }

  if (confirmation.toUpperCase() !== "ARCHIVE") {
    redirectLeadError(workspaceSlug, leadId, "Type ARCHIVE to confirm archiving this lead.");
  }

  const prisma = getPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!lead) {
    redirect(`/w/${workspaceSlug}/leads`);
  }

  await prisma.lead.update({
    where: {
      id: lead.id,
    },
    data: {
      archivedAt: new Date(),
    },
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.LEAD_WORKFLOW_UPDATED,
    targetType: "lead",
    targetId: lead.id,
    summary: `Archived lead ${lead.title}`,
  });

  revalidateLeadPaths(workspaceSlug, lead.id);
  redirect(`/w/${workspaceSlug}/leads?leadArchived=1`);
}

export async function deleteLeadAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const confirmation = requiredTrimmedString(formData, "confirmation", { maxLength: 20 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?dangerError=${encodeURIComponent("Delete requires database mode.")}`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "delete");
  }

  if (confirmation.toUpperCase() !== "DELETE") {
    redirectLeadError(workspaceSlug, leadId, "Type DELETE to confirm deleting this lead.");
  }

  const prisma = getPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    select: {
      id: true,
      title: true,
      conversations: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!lead) {
    redirect(`/w/${workspaceSlug}/leads`);
  }

  await prisma.$transaction(async (tx) => {
    const conversationIds = lead.conversations.map((conversation) => conversation.id);

    if (conversationIds.length > 0) {
      await tx.message.deleteMany({
        where: {
          conversationId: {
            in: conversationIds,
          },
        },
      });

      await tx.conversation.deleteMany({
        where: {
          id: {
            in: conversationIds,
          },
        },
      });
    }

    await tx.note.deleteMany({
      where: {
        leadId: lead.id,
      },
    });

    await tx.aIGeneration.deleteMany({
      where: {
        leadId: lead.id,
      },
    });

    await tx.leadTag.deleteMany({
      where: {
        leadId: lead.id,
      },
    });

    await tx.lead.delete({
      where: {
        id: lead.id,
      },
    });
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.LEAD_WORKFLOW_UPDATED,
    targetType: "lead",
    targetId: lead.id,
    summary: `Deleted lead ${lead.title}`,
  });

  revalidateLeadPaths(workspaceSlug);
  redirect(`/w/${workspaceSlug}/leads?leadDeleted=1`);
}

export async function bulkUpdateLeadsAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const actionType = requiredTrimmedString(formData, "bulkAction", { maxLength: 40 });
  const leadIds = parseSelectedLeadIds(formData, "leadIds");
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads?bulkUpdated=demo`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, null, "bulk");
  }

  if (leadIds.length === 0) {
    redirect(`/w/${workspaceSlug}/leads?dangerError=${encodeURIComponent("Select at least one lead for a bulk action.")}`);
  }

  const prisma = getPrismaClient();
  const validLeadIds = await prisma.lead.findMany({
    where: {
      tenantId: workspace.id,
      id: {
        in: leadIds,
      },
      archivedAt: null,
    },
    select: {
      id: true,
    },
  });
  const scopedLeadIds = validLeadIds.map((lead) => lead.id);

  if (scopedLeadIds.length === 0) {
    redirect(`/w/${workspaceSlug}/leads?dangerError=${encodeURIComponent("No valid leads were selected.")}`);
  }

  if (actionType === "set-stage") {
    const stage = parseLeadStage(
      requiredEnumValue(formData, "stage", ["New", "Qualified", "Proposal", "Follow-up", "Won", "Lost"]),
    );

    await prisma.lead.updateMany({
      where: {
        tenantId: workspace.id,
        id: {
          in: scopedLeadIds,
        },
      },
      data: {
        stage,
      },
    });

    await createAuditLog({
      tenantId: workspace.id,
      actorUserId: workspace.currentUser.id,
      action: AuditLogAction.LEAD_WORKFLOW_UPDATED,
      targetType: "lead_bulk",
      summary: `Bulk updated stage for ${scopedLeadIds.length} lead(s)`,
      metadata: {
        actionType,
        stage,
        leadIds: scopedLeadIds,
      } as Prisma.InputJsonValue,
    });
  } else if (actionType === "set-follow-up") {
    const followUpAt = parseOptionalFollowUpDate(
      requiredTrimmedString(formData, "followUpDate", { maxLength: 20 }),
    );

    await prisma.lead.updateMany({
      where: {
        tenantId: workspace.id,
        id: {
          in: scopedLeadIds,
        },
      },
      data: {
        followUpAt,
      },
    });

    await createAuditLog({
      tenantId: workspace.id,
      actorUserId: workspace.currentUser.id,
      action: AuditLogAction.LEAD_WORKFLOW_UPDATED,
      targetType: "lead_bulk",
      summary: `Bulk updated follow-up for ${scopedLeadIds.length} lead(s)`,
      metadata: {
        actionType,
        followUpAt: followUpAt?.toISOString() ?? null,
        leadIds: scopedLeadIds,
      } as Prisma.InputJsonValue,
    });
  } else if (actionType === "add-tag") {
    const tagName = requiredTrimmedString(formData, "bulkTag", { maxLength: 120 });
    const tag = await prisma.tag.upsert({
      where: {
        tenantId_name: {
          tenantId: workspace.id,
          name: tagName,
        },
      },
      update: {},
      create: {
        tenantId: workspace.id,
        name: tagName,
      },
    });

    for (const currentLeadId of scopedLeadIds) {
      await prisma.leadTag.upsert({
        where: {
          leadId_tagId: {
            leadId: currentLeadId,
            tagId: tag.id,
          },
        },
        update: {},
        create: {
          leadId: currentLeadId,
          tagId: tag.id,
          assignedBy: workspace.currentUser.id ?? undefined,
        },
      });
    }

    await createAuditLog({
      tenantId: workspace.id,
      actorUserId: workspace.currentUser.id,
      action: AuditLogAction.LEAD_INTELLIGENCE_UPDATED,
      targetType: "lead_bulk",
      summary: `Bulk tagged ${scopedLeadIds.length} lead(s)`,
      metadata: {
        actionType,
        tagName,
        leadIds: scopedLeadIds,
      } as Prisma.InputJsonValue,
    });
  } else {
    redirect(`/w/${workspaceSlug}/leads?dangerError=${encodeURIComponent("Invalid bulk action selected.")}`);
  }

  revalidateLeadPaths(workspaceSlug);
  redirect(`/w/${workspaceSlug}/leads?bulkUpdated=${scopedLeadIds.length}`);
}

export async function generateReplyDraftAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const tone = optionalTrimmedString(formData, "tone", { maxLength: 80 }) ?? "Warm and practical";
  const contextNotes = optionalTrimmedString(formData, "contextNotes", { maxLength: 1500 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?draftCreated=demo`);
  }

  if (!canContributeToLead(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "contribute");
  }

  const prisma = getPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    include: {
      contact: true,
      conversations: {
        orderBy: {
          lastMessageAt: "desc",
        },
        take: 1,
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!lead) {
    redirect(`/w/${workspaceSlug}/leads`);
  }

  const latestMessage =
    lead.conversations[0]?.messages[0]?.content ?? lead.summary ?? "the project";

  await generateReplySuggestion({
    tenantId: workspace.id,
    leadId: lead.id,
    conversationId: lead.conversations[0]?.id ?? null,
    requestedById: workspace.currentUser.id,
    contactName: lead.contact.name,
    company: lead.contact.company,
    summary: lead.summary,
    latestMessage,
    tone,
    contextNotes,
  });

  revalidateLeadPaths(workspaceSlug, leadId);
  redirect(`/w/${workspaceSlug}/leads/${leadId}?draftCreated=1`);
}

export async function generateFollowUpRecommendationAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?followUpRecommended=demo`);
  }

  if (!canManageLeadRecords(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "follow_up");
  }

  const prisma = getPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    include: {
      contact: true,
      conversations: {
        orderBy: {
          lastMessageAt: "desc",
        },
        take: 1,
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!lead) {
    redirect(`/w/${workspaceSlug}/leads`);
  }

  const latestMessage =
    lead.conversations[0]?.messages[0]?.content ?? lead.summary ?? "No recent conversation.";

  await generateFollowUpRecommendation({
    tenantId: workspace.id,
    leadId: lead.id,
    conversationId: lead.conversations[0]?.id ?? null,
    requestedById: workspace.currentUser.id,
    contactName: lead.contact.name,
    company: lead.contact.company,
    summary: lead.summary ?? latestMessage,
    latestMessage,
  });

  revalidateLeadPaths(workspaceSlug, leadId);
  redirect(`/w/${workspaceSlug}/leads/${leadId}?followUpRecommended=1`);
}

export async function sendLeadReplyAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const content = requiredTrimmedString(formData, "content", { maxLength: 5000 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?replySent=demo`);
  }

  if (!canContributeToLead(workspace.membershipRole)) {
    redirectLeadPermissionsError(workspaceSlug, leadId, "contribute");
  }

  const prisma = getPrismaClient();
  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      tenantId: workspace.id,
    },
    include: {
      conversations: {
        orderBy: {
          lastMessageAt: "desc",
        },
        take: 1,
      },
      contact: true,
    },
  });

  if (!lead) {
    redirect(`/w/${workspaceSlug}/leads`);
  }

  const now = new Date();

  const conversation =
    lead.conversations[0] ??
    (await prisma.conversation.create({
      data: {
        tenantId: workspace.id,
        contactId: lead.contactId,
        leadId: lead.id,
        subject: lead.title,
        channel: "manual",
        lastMessageAt: now,
      },
    }));

  const message = await prisma.message.create({
    data: {
      tenantId: workspace.id,
      conversationId: conversation.id,
      authorId: workspace.currentUser.id,
      direction: "OUTBOUND",
      content,
    },
  });

  await upsertMessageEmbedding({
    tenantId: workspace.id,
    messageId: message.id,
    content,
  });

  await prisma.conversation.update({
    where: {
      id: conversation.id,
    },
    data: {
      lastMessageAt: now,
    },
  });

  await prisma.lead.update({
    where: {
      id: lead.id,
    },
    data: {
      lastContactAt: now,
    },
  });

  await createAuditLog({
    tenantId: workspace.id,
    actorUserId: workspace.currentUser.id,
    action: AuditLogAction.OUTBOUND_MESSAGE_SAVED,
    targetType: "lead",
    targetId: lead.id,
    summary: "Saved outbound reply to lead conversation",
    metadata: {
      messageId: message.id,
      conversationId: conversation.id,
    },
  });

  revalidateLeadPaths(workspaceSlug, leadId);
  redirect(`/w/${workspaceSlug}/leads/${leadId}?replySent=1`);
}
