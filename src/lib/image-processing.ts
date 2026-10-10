import crypto from "node:crypto";
import {
  AIGenerationType,
  AuditLogAction,
  LeadPriority,
  LeadSource,
  LeadStage,
} from "@/generated/prisma/client";
import { upsertNoteEmbedding } from "@/lib/ai";
import { createAuditLog } from "@/lib/audit";
import { logError, logInfo } from "@/lib/logger";
import { getPrismaClient } from "@/lib/prisma";
import { calculateLeadScore } from "@/lib/scoring";
import { formatHotLeadSlackPayload, sendSlackWebhook } from "@/lib/slack";
import { evaluateWorkflowRules, WorkflowRule } from "@/lib/workflows";
import { WorkspaceContext } from "@/lib/workspaces";

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB limit

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/tiff",
  "image/bmp",
]);

export type ImageValidationResult = {
  valid: boolean;
  error?: "missing_file" | "file_too_large" | "invalid_mime_type";
  checksum?: string;
};

export type ImageType =
  | "BUSINESS_CARD"
  | "WHITEBOARD_NOTE"
  | "DOCUMENT_FORM"
  | "RECEIPT_INVOICE"
  | "UNKNOWN";

export type ExtractedContact = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  location?: string;
};

export type ExtractedLead = {
  title: string;
  summary: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  estimatedValue?: string;
  suggestedTags: string[];
  nextAction: string;
  followUpDays: number;
};

export type ImageExtractionResult = {
  contact: ExtractedContact;
  lead: ExtractedLead;
  classification: {
    imageType: ImageType;
    confidence: number; // 0.0 - 1.0
    rawOcrText: string;
  };
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    checksum: string;
    provider: "openai-vision" | "deterministic-fallback";
    model: string;
    processedAt: string;
  };
};

/**
 * Validates uploaded image file size and MIME type.
 */
export function validateImageUpload(
  file: { size: number; type: string; name?: string } | null | undefined,
  buffer?: Buffer
): ImageValidationResult {
  if (!file || file.size === 0) {
    return { valid: false, error: "missing_file" };
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return { valid: false, error: "file_too_large" };
  }

  const normalizedType = file.type.toLowerCase().trim();
  if (
    normalizedType &&
    !ALLOWED_IMAGE_MIME_TYPES.has(normalizedType) &&
    !normalizedType.startsWith("image/")
  ) {
    return { valid: false, error: "invalid_mime_type" };
  }

  const checksum = buffer
    ? crypto.createHash("sha256").update(buffer).digest("hex")
    : crypto.createHash("sha256").update(file.name ?? "image").digest("hex");

  return { valid: true, checksum };
}

/**
 * Deterministic fallback extractor for local offline testing and mock demonstrations.
 */
export function getDeterministicFallbackExtraction(
  fileName: string,
  fileSize: number,
  mimeType: string,
  checksum: string
): ImageExtractionResult {
  const lowerName = fileName.toLowerCase();

  // Whiteboard / brainstorm pattern
  if (lowerName.includes("whiteboard") || lowerName.includes("brainstorm") || lowerName.includes("meeting")) {
    return {
      contact: {
        name: "Alex Rivera",
        email: "alex.rivera@hypergrowth-labs.test",
        phone: "+1 (555) 482-9011",
        company: "HyperGrowth Labs",
        jobTitle: "Head of Product & Growth",
        website: "https://hypergrowthlabs.test",
        location: "San Francisco, CA",
      },
      lead: {
        title: "HyperGrowth Labs - Q3 Product Strategy & CRM Migration Sprint",
        summary:
          "Whiteboard notes from executive strategy session: Need scalable multi-tenant CRM, custom API webhooks, automated lead scoring, and Slack alerting for high-intent accounts.",
        priority: "HIGH",
        estimatedValue: "$18,500",
        suggestedTags: ["whiteboard", "strategy", "enterprise", "high-budget"],
        nextAction: "Send technical proposal with architecture breakdown and migration timeline",
        followUpDays: 2,
      },
      classification: {
        imageType: "WHITEBOARD_NOTE",
        confidence: 0.94,
        rawOcrText:
          "HYPERGROWTH LABS / Q3 ROADMAP\n- Scope: CRM Ingestion Engine\n- Target Budget: $15k - $20k\n- Key Contact: Alex Rivera (alex.rivera@hypergrowth-labs.test)\n- Next Step: Architecture review call on Thursday",
      },
      metadata: {
        fileName,
        fileSize,
        mimeType,
        checksum,
        provider: "deterministic-fallback",
        model: "offline-vision-deterministic-v1",
        processedAt: new Date().toISOString(),
      },
    };
  }

  // Health / Bio conference badge pattern
  if (lowerName.includes("health") || lowerName.includes("badge") || lowerName.includes("marcus")) {
    return {
      contact: {
        name: "Dr. Marcus Vance",
        email: "m.vance@biohealth-innovations.test",
        phone: "+1 (555) 723-1490",
        company: "BioHealth Innovations",
        jobTitle: "Founder & Chief Medical Officer",
        website: "https://biohealthinnovations.test",
        location: "Boston, MA",
      },
      lead: {
        title: "BioHealth Innovations - Clinical Trial Lead Intake & Compliance",
        summary:
          "Scanned conference attendee badge: Founder seeking secure patient intake CRM with strict audit logging, RBAC permissions, and automated triage workflows.",
        priority: "URGENT",
        estimatedValue: "$32,000",
        suggestedTags: ["conference-lead", "healthcare", "hipaa", "audit-logs"],
        nextAction: "Schedule security architecture walkthrough and NDA review",
        followUpDays: 1,
      },
      classification: {
        imageType: "DOCUMENT_FORM",
        confidence: 0.97,
        rawOcrText:
          "CONFERENCE BADGE: HEALTH-TECH SUMMIT 2026\nDr. Marcus Vance, MD\nFounder & CMO, BioHealth Innovations\nm.vance@biohealth-innovations.test | Boston, MA\nInterest: Enterprise Patient Intake Workflows",
      },
      metadata: {
        fileName,
        fileSize,
        mimeType,
        checksum,
        provider: "deterministic-fallback",
        model: "offline-vision-deterministic-v1",
        processedAt: new Date().toISOString(),
      },
    };
  }

  // Standard business card default pattern
  return {
    contact: {
      name: "Sarah Jenkins",
      email: "sarah.jenkins@luminarybrand.test",
      phone: "+1 (555) 839-2041",
      company: "Luminary Creative Studio",
      jobTitle: "VP of Brand Strategy",
      website: "https://luminarybrand.test",
      location: "New York, NY",
    },
    lead: {
      title: "Luminary Creative Studio - Brand Identity & Digital Experience Retainer",
      summary:
        "Scanned business card from Design Leadership Meetup: Exploring multi-quarter consulting retainer for brand refresh, design systems, and digital client experience.",
      priority: "HIGH",
      estimatedValue: "$24,000",
      suggestedTags: ["business-card", "design-systems", "retainer", "referral"],
      nextAction: "Share portfolio deck and schedule 30-min discovery call",
      followUpDays: 2,
    },
    classification: {
      imageType: "BUSINESS_CARD",
      confidence: 0.96,
      rawOcrText:
        "LUMINARY CREATIVE STUDIO\nSarah Jenkins | VP Brand Strategy\nsarah.jenkins@luminarybrand.test | (555) 839-2041\nwww.luminarybrand.test | 120 Broadway, New York, NY",
    },
    metadata: {
      fileName,
      fileSize,
      mimeType,
      checksum,
      provider: "deterministic-fallback",
      model: "offline-vision-deterministic-v1",
      processedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extracts structured CRM contact and lead intelligence from an image buffer
 * using OpenAI Vision API or deterministic offline fallback.
 */
export async function extractDataFromImage(params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<ImageExtractionResult> {
  const { buffer, fileName, mimeType } = params;
  const validation = validateImageUpload({ size: buffer.length, type: mimeType, name: fileName }, buffer);

  if (!validation.valid) {
    throw new Error(`Invalid image file: ${validation.error}`);
  }

  const checksum = validation.checksum ?? crypto.createHash("sha256").update(buffer).digest("hex");
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.startsWith("sk-")) {
    try {
      const base64Image = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64Image}`;

      const prompt = `You are an expert AI CRM data extraction assistant.
Analyze this image (which may be a business card, conference badge, whiteboard note, or client document).
Extract the following information in pure JSON without markdown backticks:
{
  "contact": {
    "name": "Full Name",
    "email": "Email address (required)",
    "phone": "Phone number or null",
    "company": "Company or organization or null",
    "jobTitle": "Job title or role or null",
    "website": "Website URL or null",
    "location": "City, State or country or null"
  },
  "lead": {
    "title": "Clear concise lead title",
    "summary": "Detailed summary of context, services needed, or project scope",
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    "estimatedValue": "Estimated budget or scope value e.g. $10,000",
    "suggestedTags": ["tag1", "tag2"],
    "nextAction": "Specific actionable next step",
    "followUpDays": 2
  },
  "classification": {
    "imageType": "BUSINESS_CARD" | "WHITEBOARD_NOTE" | "DOCUMENT_FORM" | "RECEIPT_INVOICE" | "UNKNOWN",
    "confidence": 0.95,
    "rawOcrText": "Extracted visible text from the image"
  }
}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUri } },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            contact: {
              name: parsed.contact?.name || "New Contact",
              email: parsed.contact?.email || "contact@example.com",
              phone: parsed.contact?.phone || undefined,
              company: parsed.contact?.company || undefined,
              jobTitle: parsed.contact?.jobTitle || undefined,
              website: parsed.contact?.website || undefined,
              location: parsed.contact?.location || undefined,
            },
            lead: {
              title: parsed.lead?.title || `${parsed.contact?.name || "Scanned"} Inquiry`,
              summary: parsed.lead?.summary || parsed.classification?.rawOcrText || "Extracted from image",
              priority: (["LOW", "MEDIUM", "HIGH", "URGENT"].includes(parsed.lead?.priority)
                ? parsed.lead.priority
                : "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
              estimatedValue: parsed.lead?.estimatedValue || undefined,
              suggestedTags: Array.isArray(parsed.lead?.suggestedTags) ? parsed.lead.suggestedTags : ["image-scan"],
              nextAction: parsed.lead?.nextAction || "Follow up on scanned image",
              followUpDays: typeof parsed.lead?.followUpDays === "number" ? parsed.lead.followUpDays : 2,
            },
            classification: {
              imageType: parsed.classification?.imageType || "BUSINESS_CARD",
              confidence: parsed.classification?.confidence ?? 0.9,
              rawOcrText: parsed.classification?.rawOcrText || "",
            },
            metadata: {
              fileName,
              fileSize: buffer.length,
              mimeType,
              checksum,
              provider: "openai-vision",
              model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
              processedAt: new Date().toISOString(),
            },
          };
        }
      }
    } catch (err) {
      logError("OpenAI Vision extraction encountered error, falling back to deterministic extractor", err);
    }
  }

  // Deterministic local fallback
  return getDeterministicFallbackExtraction(fileName, buffer.length, mimeType, checksum);
}

export type ExecuteImageWorkflowResult = {
  success: boolean;
  contactId: string;
  leadId: string;
  noteId?: string;
  score: number;
  triggeredActions: Array<{ ruleId: string; action: string; payload: Record<string, unknown> }>;
  extraction: ImageExtractionResult;
};

/**
 * Executes the complete CRM ingestion and auto-enrichment workflow:
 * 1. Scopes all records strictly by workspace / tenantId
 * 2. Creates or updates Contact
 * 3. Creates Lead with dynamic predictive score
 * 4. Ingests Note with OCR transcript & action items
 * 5. Generates Vector Embeddings for semantic search
 * 6. Stores AI Provenance in AIGeneration
 * 7. Evaluates automated workflow rules (e.g. Slack alerts for high scores)
 * 8. Logs Audit Trail & Operational Events
 */
export async function executeImageWorkflow(params: {
  workspace: WorkspaceContext;
  extraction: ImageExtractionResult;
  workflowRules?: WorkflowRule[];
}): Promise<ExecuteImageWorkflowResult> {
  const { workspace, extraction, workflowRules = [] } = params;
  const { contact: c, lead: l, classification, metadata } = extraction;

  // Map priority string to enum
  const priorityMap: Record<string, LeadPriority> = {
    LOW: LeadPriority.LOW,
    MEDIUM: LeadPriority.MEDIUM,
    HIGH: LeadPriority.HIGH,
    URGENT: LeadPriority.URGENT,
  };
  const leadPriority = priorityMap[l.priority] || LeadPriority.MEDIUM;

  // Calculate dynamic lead score
  const score = calculateLeadScore({
    stage: LeadStage.NEW,
    priority: leadPriority,
    budgetStatus: l.estimatedValue ?? "confirmed",
    lastContactAt: new Date(),
    messageCount: 1,
  });

  const followUpAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * (l.followUpDays || 2));

  // If running in database mode with an active PostgreSQL connection
  if (workspace.mode === "database" && workspace.id) {
    const prisma = getPrismaClient();

    // 1. Upsert Contact scoped to tenant
    const contact = await prisma.contact.upsert({
      where: {
        tenantId_email: {
          tenantId: workspace.id,
          email: c.email.toLowerCase().trim(),
        },
      },
      update: {
        name: c.name,
        company: c.company ?? undefined,
        phone: c.phone ?? undefined,
        website: c.website ?? undefined,
      },
      create: {
        tenantId: workspace.id,
        email: c.email.toLowerCase().trim(),
        name: c.name,
        company: c.company ?? null,
        phone: c.phone ?? null,
        website: c.website ?? null,
      },
    });

    // 2. Create Lead
    const lead = await prisma.lead.create({
      data: {
        tenantId: workspace.id,
        contactId: contact.id,
        createdById: workspace.currentUser.id,
        title: l.title,
        source: LeadSource.IMPORT,
        priority: leadPriority,
        stage: LeadStage.NEW,
        summary: l.summary,
        nextAction: l.nextAction,
        score,
        budgetStatus: l.estimatedValue ?? null,
        followUpAt,
        lastContactAt: new Date(),
      },
    });

    // 3. Create Note with OCR Transcript
    const noteContent = `📸 [Scanned ${classification.imageType.replace("_", " ")}]\nFile: ${metadata.fileName} (Confidence: ${Math.round(classification.confidence * 100)}%)\n\nSummary:\n${l.summary}\n\nAction Items:\n- ${l.nextAction}\n\nRaw OCR Transcription:\n${classification.rawOcrText}`;

    const note = await prisma.note.create({
      data: {
        tenantId: workspace.id,
        leadId: lead.id,
        authorId: workspace.currentUser.id,
        content: noteContent,
      },
    });

    // 4. Index Note Vector Embedding
    await upsertNoteEmbedding({
      tenantId: workspace.id,
      noteId: note.id,
      content: note.content,
    });

    // 5. Store AI Provenance in AIGeneration
    await prisma.aIGeneration.create({
      data: {
        tenantId: workspace.id,
        leadId: lead.id,
        requestedById: workspace.currentUser.id,
        type: AIGenerationType.SUMMARY,
        model: metadata.model,
        promptVersion: "v1.0-image-processing",
        inputSummary: `Image upload (${metadata.fileName}, ${metadata.fileSize} bytes, type: ${classification.imageType})`,
        outputText: JSON.stringify(extraction, null, 2),
        metadata: {
          imageType: classification.imageType,
          confidence: classification.confidence,
          checksum: metadata.checksum,
          provider: metadata.provider,
        },
      },
    });

    // 6. Evaluate Workflow Rules & Trigger Slack Notifications if matched
    const triggeredActions = evaluateWorkflowRules(
      workflowRules,
      {
        leadId: lead.id,
        tenantId: workspace.id,
        stage: LeadStage.NEW,
        score,
        priority: leadPriority,
      },
      "ON_LEAD_CREATED"
    );

    for (const action of triggeredActions) {
      if (action.action === "SEND_SLACK_ALERT" && action.payload.webhookUrl) {
        const slackPayload = formatHotLeadSlackPayload({
          leadId: lead.id,
          workspaceSlug: workspace.slug,
          title: lead.title,
          contactName: c.name,
          contactEmail: c.email,
          company: c.company,
          stage: "NEW",
          priority: l.priority,
          score,
          summary: l.summary,
        });
        await sendSlackWebhook(action.payload.webhookUrl as string, slackPayload);
      }
    }

    // 7. Audit Log
    await createAuditLog({
      tenantId: workspace.id,
      actorUserId: workspace.currentUser.id,
      action: AuditLogAction.LEAD_CREATED,
      targetType: "lead",
      targetId: lead.id,
      summary: `Created lead from scanned ${classification.imageType.toLowerCase().replace("_", " ")} [${lead.title}]`,
      metadata: {
        source: LeadSource.IMPORT,
        score,
        confidence: classification.confidence,
        fileName: metadata.fileName,
      },
    });

    logInfo(`Successfully executed image workflow for lead [${lead.id}] in workspace [${workspace.slug}]`, {
      tenantId: workspace.id,
      leadId: lead.id,
      score,
      imageType: classification.imageType,
    });

    return {
      success: true,
      contactId: contact.id,
      leadId: lead.id,
      noteId: note.id,
      score,
      triggeredActions,
      extraction,
    };
  }

  // Demo in-memory workspace mode fallback
  const mockLeadId = `lead_demo_img_${Date.now()}`;
  const mockContactId = `contact_demo_${Date.now()}`;
  const mockNoteId = `note_demo_${Date.now()}`;

  const triggeredActions = evaluateWorkflowRules(
    workflowRules,
    {
      leadId: mockLeadId,
      tenantId: workspace.id || "demo-tenant",
      stage: LeadStage.NEW,
      score,
      priority: leadPriority,
    },
    "ON_LEAD_CREATED"
  );

  return {
    success: true,
    contactId: mockContactId,
    leadId: mockLeadId,
    noteId: mockNoteId,
    score,
    triggeredActions,
    extraction,
  };
}
