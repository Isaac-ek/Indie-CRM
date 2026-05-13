import { createHash } from "crypto";
import OpenAI from "openai";
import { AIGenerationType } from "@/generated/prisma/client";
import { createOperationalEvent } from "@/lib/operational-events";
import { getPrismaClient } from "@/lib/prisma";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const aiModel = process.env.OPENAI_MODEL ?? "gpt-5-mini";
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

type LeadIntelligence = {
  summary: string;
  budgetStatus: string;
  suggestedFollowUpDays: number;
  tags: string[];
  nextAction: string;
};

function fallbackLeadIntelligence(inquiry: string): LeadIntelligence {
  const lower = inquiry.toLowerCase();
  const compactInquiry = inquiry.replace(/\s+/g, " ").trim();
  const summarySeed = compactInquiry.replace(/[.!?]+$/, "");

  return {
    summary: `Lead is asking for ${summarySeed.slice(0, 180)}.`,
    budgetStatus: lower.includes("budget") ? "mentioned" : "unknown",
    suggestedFollowUpDays: lower.includes("urgent") || lower.includes("asap") ? 1 : 2,
    tags: [
      lower.includes("design") || lower.includes("brand") ? "branding" : "general inquiry",
      lower.includes("urgent") || lower.includes("june") ? "timeline urgent" : "new lead",
    ],
    nextAction: "Acknowledge the request, clarify budget and timeline, and suggest the next step.",
  };
}

function fallbackReplyDraft(name: string, context: string) {
  return [
    `Hi ${name.split(" ")[0]},`,
    "",
    "Thanks for the detailed context.",
    `Based on what you shared, ${context}`,
    "I can put together a practical next-step plan and recommend the best scope from here.",
    "",
    "Best,",
    "Chiemelie",
  ].join("\n");
}

function fallbackFollowUpRecommendation(summary: string, latestActivity: string) {
  return {
    nextAction: "Send a short follow-up that references the current scope and asks for the clearest next decision.",
    recommendedDays: latestActivity.toLowerCase().includes("urgent") ? 1 : 3,
    reasoning: `The lead context points to "${summary || latestActivity}". A prompt follow-up should keep momentum without overcomplicating the ask.`,
  };
}

function fallbackGroundedAnswer(query: string, snippets: string[]) {
  if (snippets.length === 0) {
    return `I could not find grounded workspace evidence for "${query}" yet.`;
  }

  return `Based on the closest workspace evidence for "${query}", the strongest pattern is: ${snippets
    .slice(0, 2)
    .join(" ")}`.slice(0, 420);
}

function normalizeEmbeddingInput(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hashEmbeddingContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function fallbackEmbeddingVector(input: string) {
  const normalized = normalizeEmbeddingInput(input).toLowerCase();
  const dimensions = 64;
  const vector = Array.from({ length: dimensions }, () => 0);

  for (const token of normalized.split(/\s+/).filter(Boolean)) {
    let hash = 0;

    for (let index = 0; index < token.length; index += 1) {
      hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
    }

    vector[hash % dimensions] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

async function createEmbeddingVector(input: string) {
  const normalized = normalizeEmbeddingInput(input);

  if (!normalized) {
    return {
      model: "fallback-local-embedding",
      vector: fallbackEmbeddingVector("empty"),
      contentHash: hashEmbeddingContent(normalized),
    };
  }

  if (!openai) {
    return {
      model: "fallback-local-embedding",
      vector: fallbackEmbeddingVector(normalized),
      contentHash: hashEmbeddingContent(normalized),
    };
  }

  try {
    const response = await openai.embeddings.create({
      model: embeddingModel,
      input: normalized,
    });

    return {
      model: embeddingModel,
      vector: response.data[0]?.embedding ?? fallbackEmbeddingVector(normalized),
      contentHash: hashEmbeddingContent(normalized),
    };
  } catch {
    return {
      model: "fallback-local-embedding",
      vector: fallbackEmbeddingVector(normalized),
      contentHash: hashEmbeddingContent(normalized),
    };
  }
}

export async function upsertMessageEmbedding(params: {
  tenantId: string;
  messageId: string;
  content: string;
}) {
  const prisma = getPrismaClient();
  const embedding = await createEmbeddingVector(params.content);

  await prisma.messageEmbedding.upsert({
    where: {
      messageId: params.messageId,
    },
    update: {
      model: embedding.model,
      contentHash: embedding.contentHash,
      vector: embedding.vector,
    },
    create: {
      tenantId: params.tenantId,
      messageId: params.messageId,
      model: embedding.model,
      contentHash: embedding.contentHash,
      vector: embedding.vector,
    },
  });

  return embedding;
}

export async function upsertNoteEmbedding(params: {
  tenantId: string;
  noteId: string;
  content: string;
}) {
  const prisma = getPrismaClient();
  const embedding = await createEmbeddingVector(params.content);

  await prisma.noteEmbedding.upsert({
    where: {
      noteId: params.noteId,
    },
    update: {
      model: embedding.model,
      contentHash: embedding.contentHash,
      vector: embedding.vector,
    },
    create: {
      tenantId: params.tenantId,
      noteId: params.noteId,
      model: embedding.model,
      contentHash: embedding.contentHash,
      vector: embedding.vector,
    },
  });

  return embedding;
}

export async function generateSearchEmbedding(query: string) {
  const embedding = await createEmbeddingVector(query);
  return embedding.vector;
}

export async function backfillMessageEmbeddings(params?: {
  tenantId?: string;
  limit?: number;
}) {
  const prisma = getPrismaClient();
  const messages = await prisma.message.findMany({
    where: {
      ...(params?.tenantId ? { tenantId: params.tenantId } : {}),
      embeddings: {
        none: {},
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: params?.limit ?? 50,
    select: {
      id: true,
      tenantId: true,
      content: true,
    },
  });

  for (const message of messages) {
    await upsertMessageEmbedding({
      tenantId: message.tenantId,
      messageId: message.id,
      content: message.content,
    });
  }

  return {
    processed: messages.length,
  };
}

export async function backfillNoteEmbeddings(params?: {
  tenantId?: string;
  limit?: number;
}) {
  const prisma = getPrismaClient();
  const notes = await prisma.note.findMany({
    where: {
      ...(params?.tenantId ? { tenantId: params.tenantId } : {}),
      embeddings: {
        none: {},
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: params?.limit ?? 50,
    select: {
      id: true,
      tenantId: true,
      content: true,
    },
  });

  for (const note of notes) {
    await upsertNoteEmbedding({
      tenantId: note.tenantId,
      noteId: note.id,
      content: note.content,
    });
  }

  return {
    processed: notes.length,
  };
}

async function getTenantAIInstructions(tenantId: string) {
  const tenant = await getPrismaClient().tenant.findUnique({
    where: { id: tenantId },
    select: { aiInstructions: true },
  });

  return tenant?.aiInstructions?.trim() || null;
}

async function createStructuredLeadIntelligence(prompt: string) {
  if (!openai) {
    return null;
  }

  const response = await openai.responses.create({
    model: aiModel,
    input: prompt,
    text: {
      format: {
        type: "json_schema",
        name: "lead_intelligence",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            budgetStatus: { type: "string" },
            suggestedFollowUpDays: { type: "integer", minimum: 1, maximum: 14 },
            tags: {
              type: "array",
              items: { type: "string" },
              minItems: 1,
              maxItems: 5,
            },
            nextAction: { type: "string" },
          },
          required: [
            "summary",
            "budgetStatus",
            "suggestedFollowUpDays",
            "tags",
            "nextAction",
          ],
        },
      },
    },
  });

  return response.output_text;
}

export async function generateLeadIntelligence(params: {
  tenantId: string;
  leadId: string;
  requestedById: string | null;
  contactName: string;
  company: string | null;
  inquiry: string;
}) {
  const prisma = getPrismaClient();
  const tenantInstructions = await getTenantAIInstructions(params.tenantId);

  let intelligence = fallbackLeadIntelligence(params.inquiry);

  try {
    const outputText = await createStructuredLeadIntelligence(
      [
        "You are classifying and summarizing a new CRM lead.",
        "Return strict JSON only.",
        `Contact name: ${params.contactName}`,
        `Company: ${params.company ?? "Unknown"}`,
        `Inquiry: ${params.inquiry}`,
        `Workspace instructions: ${tenantInstructions ?? "None"}`,
        "Infer practical tags, a concise summary, budget status, and the next action.",
      ].join("\n"),
    );

    if (outputText) {
      intelligence = JSON.parse(outputText) as LeadIntelligence;
    }
  } catch (error) {
    await createOperationalEvent({
      tenantId: params.tenantId,
      source: "ai.lead_intelligence",
      message: error instanceof Error ? error.message : "Lead intelligence generation failed.",
      metadata: {
        leadId: params.leadId,
        requestedById: params.requestedById,
      },
    });
    intelligence = fallbackLeadIntelligence(params.inquiry);
  }

  const followUpAt = new Date(
    Date.now() + intelligence.suggestedFollowUpDays * 24 * 60 * 60 * 1000,
  );

  await prisma.lead.update({
    where: { id: params.leadId },
    data: {
      summary: intelligence.summary,
      nextAction: intelligence.nextAction,
      budgetStatus: intelligence.budgetStatus,
      followUpAt,
    },
  });

  for (const tagName of intelligence.tags) {
    const tag = await prisma.tag.upsert({
      where: {
        tenantId_name: {
          tenantId: params.tenantId,
          name: tagName,
        },
      },
      update: {},
      create: {
        tenantId: params.tenantId,
        name: tagName,
      },
    });

    await prisma.leadTag.upsert({
      where: {
        leadId_tagId: {
          leadId: params.leadId,
          tagId: tag.id,
        },
      },
      update: {},
      create: {
        leadId: params.leadId,
        tagId: tag.id,
      },
    });
  }

  await prisma.aIGeneration.createMany({
    data: [
      {
        tenantId: params.tenantId,
        leadId: params.leadId,
        requestedById: params.requestedById,
        type: AIGenerationType.TAGGING,
        model: openai ? aiModel : "fallback-local",
        promptVersion: "v1-lead-tagging",
        inputSummary: params.inquiry,
        outputText: intelligence.tags.join(", "),
      },
      {
        tenantId: params.tenantId,
        leadId: params.leadId,
        requestedById: params.requestedById,
        type: AIGenerationType.SUMMARY,
        model: openai ? aiModel : "fallback-local",
        promptVersion: "v1-lead-summary",
        inputSummary: params.inquiry,
        outputText: `${intelligence.summary}\n\nNext action: ${intelligence.nextAction}`,
      },
    ],
  });
}

export async function generateReplySuggestion(params: {
  tenantId: string;
  leadId: string;
  conversationId: string | null;
  requestedById: string | null;
  contactName: string;
  company: string | null;
  summary: string | null;
  latestMessage: string;
  tone: string;
  contextNotes: string | null;
}) {
  const tenantInstructions = await getTenantAIInstructions(params.tenantId);
  let draft = fallbackReplyDraft(
    params.contactName,
    params.summary ?? params.latestMessage,
  );

  if (openai) {
    try {
      const response = await openai.responses.create({
        model: aiModel,
        input: [
          {
            role: "system",
            content:
              "You write concise professional client replies for a solo-operator CRM. Keep the tone warm, practical, and action-oriented.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `Contact name: ${params.contactName}`,
                  `Company: ${params.company ?? "Unknown"}`,
                  `Lead summary: ${params.summary ?? "None"}`,
                  `Latest message: ${params.latestMessage}`,
                  `Requested tone: ${params.tone}`,
                  `Additional context: ${params.contextNotes ?? "None"}`,
                  `Workspace instructions: ${tenantInstructions ?? "None"}`,
                  "Write a reply draft with a clear next step.",
                ].join("\n"),
              },
            ],
          },
        ],
      });

      if (response.output_text) {
        draft = response.output_text;
      }
    } catch (error) {
      await createOperationalEvent({
        tenantId: params.tenantId,
        source: "ai.reply_suggestion",
        message: error instanceof Error ? error.message : "Reply suggestion generation failed.",
        metadata: {
          leadId: params.leadId,
          conversationId: params.conversationId,
          requestedById: params.requestedById,
        },
      });
      draft = fallbackReplyDraft(
        params.contactName,
        params.summary ?? params.latestMessage,
      );
    }
  }

  await getPrismaClient().aIGeneration.create({
    data: {
      tenantId: params.tenantId,
      leadId: params.leadId,
      conversationId: params.conversationId ?? undefined,
      requestedById: params.requestedById,
      type: AIGenerationType.REPLY_SUGGESTION,
      model: openai ? aiModel : "fallback-local",
      promptVersion: "v1-reply-draft",
      inputSummary: [params.latestMessage, params.tone, params.contextNotes ?? ""].join("\n\n"),
      outputText: draft,
    },
  });

  return draft;
}

export async function generateFollowUpRecommendation(params: {
  tenantId: string;
  leadId: string;
  conversationId: string | null;
  requestedById: string | null;
  contactName: string;
  company: string | null;
  summary: string;
  latestMessage: string;
}) {
  const tenantInstructions = await getTenantAIInstructions(params.tenantId);
  let recommendation = fallbackFollowUpRecommendation(params.summary, params.latestMessage);

  if (openai) {
    try {
      const response = await openai.responses.create({
        model: aiModel,
        input: [
          {
            role: "system",
            content:
              "You recommend the next CRM follow-up step for a solo operator. Be specific, practical, and concise.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `Contact name: ${params.contactName}`,
                  `Company: ${params.company ?? "Unknown"}`,
                  `Lead summary: ${params.summary}`,
                  `Latest message: ${params.latestMessage}`,
                  `Workspace instructions: ${tenantInstructions ?? "None"}`,
                  "Return JSON with nextAction, recommendedDays, and reasoning.",
                ].join("\n"),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "follow_up_recommendation",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                nextAction: { type: "string" },
                recommendedDays: { type: "integer", minimum: 1, maximum: 14 },
                reasoning: { type: "string" },
              },
              required: ["nextAction", "recommendedDays", "reasoning"],
            },
          },
        },
      });

      if (response.output_text) {
        recommendation = JSON.parse(response.output_text) as typeof recommendation;
      }
    } catch (error) {
      await createOperationalEvent({
        tenantId: params.tenantId,
        source: "ai.follow_up",
        message: error instanceof Error ? error.message : "Follow-up recommendation failed.",
        metadata: {
          leadId: params.leadId,
          conversationId: params.conversationId,
          requestedById: params.requestedById,
        },
      });
      recommendation = fallbackFollowUpRecommendation(params.summary, params.latestMessage);
    }
  }

  const followUpAt = new Date(Date.now() + recommendation.recommendedDays * 24 * 60 * 60 * 1000);

  await getPrismaClient().lead.update({
    where: { id: params.leadId },
    data: {
      nextAction: recommendation.nextAction,
      followUpAt,
    },
  });

  await getPrismaClient().aIGeneration.create({
    data: {
      tenantId: params.tenantId,
      leadId: params.leadId,
      conversationId: params.conversationId ?? undefined,
      requestedById: params.requestedById,
      type: AIGenerationType.FOLLOW_UP,
      model: openai ? aiModel : "fallback-local",
      promptVersion: "v1-follow-up-recommendation",
      inputSummary: params.latestMessage,
      outputText: `${recommendation.nextAction}\n\nReasoning: ${recommendation.reasoning}\nRecommended follow-up: ${recommendation.recommendedDays} day(s)`,
    },
  });

  return recommendation;
}

export async function generateGroundedSearchAnswer(params: {
  tenantId: string;
  query: string;
  evidence: Array<{ label: string; quote: string }>;
}) {
  const tenantInstructions = await getTenantAIInstructions(params.tenantId);
  const evidenceText = params.evidence
    .map((item, index) => `Evidence ${index + 1} (${item.label}): ${item.quote}`)
    .join("\n");

  let answer = fallbackGroundedAnswer(
    params.query,
    params.evidence.map((item) => item.quote),
  );

  if (openai && params.evidence.length > 0) {
    try {
      const response = await openai.responses.create({
        model: aiModel,
        input: [
          {
            role: "system",
            content:
              "Answer only from the provided CRM evidence. Be brief, explicit about uncertainty, and do not invent facts.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: [
                  `Workspace instructions: ${tenantInstructions ?? "None"}`,
                  `Question: ${params.query}`,
                  evidenceText,
                  "Answer in 2-4 sentences using only the evidence.",
                ].join("\n\n"),
              },
            ],
          },
        ],
      });

      if (response.output_text) {
        answer = response.output_text;
      }
    } catch (error) {
      await createOperationalEvent({
        tenantId: params.tenantId,
        source: "ai.grounded_search",
        message: error instanceof Error ? error.message : "Grounded search answer generation failed.",
        metadata: {
          query: params.query,
          evidenceCount: params.evidence.length,
        },
      });
      answer = fallbackGroundedAnswer(
        params.query,
        params.evidence.map((item) => item.quote),
      );
    }
  }

  await getPrismaClient().aIGeneration.create({
    data: {
      tenantId: params.tenantId,
      type: AIGenerationType.SEARCH_ANSWER,
      model: openai ? aiModel : "fallback-local",
      promptVersion: "v1-grounded-search-answer",
      inputSummary: params.query,
      outputText: answer,
      metadata: {
        evidence: params.evidence,
      },
    },
  });

  return answer;
}
