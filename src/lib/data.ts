import { LeadPriority, LeadSource, LeadStage, Prisma } from "@/generated/prisma/client";
import { generateGroundedSearchAnswer, generateSearchEmbedding } from "@/lib/ai";
import { getPrismaClient } from "@/lib/prisma";
import {
  activityFeed,
  leadDetails as demoLeadDetails,
  leads as demoLeads,
  metrics as demoMetrics,
  semanticMatches,
} from "@/lib/mock-data";

type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

type LeadListItem = {
  id: string;
  name: string;
  company: string;
  title: string;
  stage: "New" | "Qualified" | "Proposal" | "Follow-up" | "Won" | "Lost";
  source: string;
  sourceValue: LeadSource;
  priority: "Low" | "Medium" | "High" | "Urgent";
  priorityValue: LeadPriority;
  lastMessage: string;
  summary: string;
  nextAction: string;
  followUp: string;
  tags: string[];
};

type DashboardData = {
  metrics: DashboardMetric[];
  leads: LeadListItem[];
  activityFeed: { id: string; title: string; body: string }[];
  semanticMatches: { query: string; result: string }[];
  pipelineCounts: Record<"New" | "Qualified" | "Proposal" | "Follow-up", number>;
  followUpQueue: {
    id: string;
    name: string;
    company: string;
    stage: LeadListItem["stage"];
    followUp: string;
    timing: "Overdue" | "Due today" | "Upcoming";
  }[];
};

export type SearchResultItem = {
  id: string;
  name: string;
  company: string;
  stage: LeadListItem["stage"];
  summary: string;
  followUp: string;
  tags: string[];
  score: number;
  matchedOn: string[];
  snippets: {
    text: string;
    targetKind?: "message" | "note" | "ai";
    targetId?: string;
  }[];
};

type GroundedAnswerCitation = {
  leadId: string;
  leadName: string;
  label: string;
  quote: string;
  targetKind?: "message" | "note";
  targetId?: string;
};

type SearchData = {
  query: string;
  results: SearchResultItem[];
  suggestions: string[];
  searchedCount: number;
  answer: {
    text: string;
    citations: GroundedAnswerCitation[];
  } | null;
};

type LeadDetailData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  industry: string;
  website: string;
  companyNotes: string;
  company: string;
  title: string;
  stage: "New" | "Qualified" | "Proposal" | "Follow-up" | "Won" | "Lost";
  source: string;
  sourceValue: LeadSource;
  priority: "Low" | "Medium" | "High" | "Urgent";
  priorityValue: LeadPriority;
  summary: string;
  followUp: string;
  followUpDateValue: string;
  nextAction: string;
  tagsValue: string;
  tagSuggestions: string[];
  tags: string[];
  messages: {
    id: string;
    direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
    content: string;
    createdAt: string;
    createdAtValue: string;
  }[];
  notes: {
    id: string;
    content: string;
    createdAt: string;
    createdAtValue: string;
    author: string;
  }[];
  aiOutputs: {
    id: string;
    label: string;
    body: string;
    createdAt: string;
    createdAtValue: string;
  }[];
  similarLeads: {
    id: string;
    name: string;
    company: string;
    stage: "New" | "Qualified" | "Proposal" | "Follow-up" | "Won" | "Lost";
    score: number;
    summary: string;
    matchedExcerpt: string;
    tags: string[];
  }[];
  isArchived: boolean;
};

function formatLeadStage(stage: LeadStage): LeadListItem["stage"] {
  switch (stage) {
    case "NEW":
      return "New";
    case "QUALIFIED":
      return "Qualified";
    case "PROPOSAL":
      return "Proposal";
    case "FOLLOW_UP":
      return "Follow-up";
    case "WON":
      return "Won";
    case "LOST":
      return "Lost";
    default:
      return "New";
  }
}

function formatSource(source: string) {
  return source.charAt(0) + source.slice(1).toLowerCase();
}

function formatPriority(priority: LeadPriority): LeadListItem["priority"] {
  switch (priority) {
    case "LOW":
      return "Low";
    case "MEDIUM":
      return "Medium";
    case "HIGH":
      return "High";
    case "URGENT":
      return "Urgent";
    default:
      return "Medium";
  }
}

function parseMockSource(source: string): LeadSource {
  switch (source.toLowerCase()) {
    case "website form":
      return LeadSource.FORM;
    case "email":
      return LeadSource.EMAIL;
    case "referral":
      return LeadSource.REFERRAL;
    case "import":
      return LeadSource.IMPORT;
    default:
      return LeadSource.MANUAL;
  }
}

function parseMockPriority(priority: "Low" | "Medium" | "High" | "Urgent"): LeadPriority {
  switch (priority) {
    case "Low":
      return LeadPriority.LOW;
    case "Medium":
      return LeadPriority.MEDIUM;
    case "High":
      return LeadPriority.HIGH;
    case "Urgent":
      return LeadPriority.URGENT;
    default:
      return LeadPriority.MEDIUM;
  }
}

function formatFollowUp(date: Date | null) {
  if (!date) return "Unscheduled";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizeComparableText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function hasDistinctSummary(summary: string, lastMessage: string) {
  if (!summary.trim() || !lastMessage.trim()) {
    return Boolean(summary.trim());
  }

  return normalizeComparableText(summary) !== normalizeComparableText(lastMessage);
}

function formatDateInputValue(date: Date | null) {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildFallbackTimestamp(offset: number) {
  return new Date(Date.now() - offset * 60 * 60 * 1000).toISOString();
}

function getFollowUpTiming(date: Date | null): "Overdue" | "Due today" | "Upcoming" | null {
  if (!date) {
    return null;
  }

  const today = new Date();
  const todayValue = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const followUpValue = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  if (followUpValue < todayValue) {
    return "Overdue";
  }

  if (followUpValue === todayValue) {
    return "Due today";
  }

  return "Upcoming";
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function tokenizeSearchQuery(query: string) {
  return Array.from(
    new Set(
      normalizeSearchText(query)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2),
    ),
  );
}

function excerptSnippet(value: string, token?: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "";
  }

  if (!token) {
    return cleaned.slice(0, 160);
  }

  const lower = cleaned.toLowerCase();
  const matchIndex = lower.indexOf(token.toLowerCase());

  if (matchIndex === -1) {
    return cleaned.slice(0, 160);
  }

  const start = Math.max(0, matchIndex - 48);
  const end = Math.min(cleaned.length, matchIndex + token.length + 112);
  const snippet = cleaned.slice(start, end);

  return `${start > 0 ? "..." : ""}${snippet}${end < cleaned.length ? "..." : ""}`;
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || right.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function formatVectorLiteral(values: number[]) {
  const normalized = values
    .map((value) => (Number.isFinite(value) ? value : 0))
    .map((value) => Number(value).toString());

  return `[${normalized.join(",")}]`;
}

type SemanticSearchRow = {
  leadId: string;
  messageId: string;
  messageContent: string;
  similarity: number;
};

async function fetchPgvectorSemanticMatches(params: {
  tenantId: string;
  queryEmbedding: number[];
  limit?: number;
}) {
  const prisma = getPrismaClient();
  const vectorLiteral = formatVectorLiteral(params.queryEmbedding);

  const rows = await prisma.$queryRaw<SemanticSearchRow[]>(Prisma.sql`
    WITH ranked_matches AS (
      SELECT
        c."leadId" AS "leadId",
        m."id" AS "messageId",
        m."content" AS "messageContent",
        1 - (
          (me."vector"::text)::vector <=> (${vectorLiteral})::vector
        ) AS similarity,
        ROW_NUMBER() OVER (
          PARTITION BY c."leadId"
          ORDER BY
            (me."vector"::text)::vector <=> (${vectorLiteral})::vector ASC,
            m."createdAt" DESC
        ) AS rank
      FROM "MessageEmbedding" me
      INNER JOIN "Message" m ON m."id" = me."messageId"
      INNER JOIN "Conversation" c ON c."id" = m."conversationId"
      WHERE me."tenantId" = ${params.tenantId}
        AND c."leadId" IS NOT NULL
        AND me."vector" IS NOT NULL
    )
    SELECT
      "leadId",
      "messageId",
      "messageContent",
      similarity
    FROM ranked_matches
    WHERE rank = 1
      AND similarity >= 0.55
    ORDER BY similarity DESC
    LIMIT ${params.limit ?? 12}
  `);

  return rows;
}

function mergeSearchResults(
  keywordResults: SearchResultItem[],
  semanticResults: SearchResultItem[],
) {
  const merged = new Map<string, SearchResultItem>();

  for (const result of [...keywordResults, ...semanticResults]) {
    const existing = merged.get(result.id);

    if (!existing) {
      merged.set(result.id, result);
      continue;
    }

    merged.set(result.id, {
      ...existing,
      score: Math.max(existing.score, result.score),
      matchedOn: Array.from(new Set([...existing.matchedOn, ...result.matchedOn])),
      snippets: [
        ...existing.snippets,
        ...result.snippets.filter(
          (snippet) =>
            !existing.snippets.some(
              (entry) =>
                entry.text === snippet.text &&
                entry.targetKind === snippet.targetKind &&
                entry.targetId === snippet.targetId,
            ),
        ),
      ].slice(0, 3),
      tags: Array.from(new Set([...existing.tags, ...result.tags])),
    });
  }

  return Array.from(merged.values()).sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  );
}

function buildSearchResults<
  T extends {
    id: string;
    name: string;
    company: string;
    stage: LeadListItem["stage"];
    summary: string;
    followUp: string;
    tags: string[];
    searchable: {
      label: string;
      text: string;
      weight: number;
      targetKind?: "message" | "note" | "ai";
      targetId?: string;
    }[];
  },
>(items: T[], query: string): SearchResultItem[] {
  const tokens = tokenizeSearchQuery(query);

  if (tokens.length === 0) {
    return items
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        name: item.name,
        company: item.company,
        stage: item.stage,
        summary: item.summary,
        followUp: item.followUp,
        tags: item.tags,
        score: 1,
        matchedOn: ["Recent lead memory"],
        snippets: [{ text: excerptSnippet(item.summary) }],
      }));
  }

  return items
    .map((item) => {
      let score = 0;
      const matchedOn = new Set<string>();
      const snippets: SearchResultItem["snippets"] = [];

      for (const field of item.searchable) {
        const haystack = normalizeSearchText(field.text);
        const matchedTokens = tokens.filter((token) => haystack.includes(token));

        if (matchedTokens.length === 0) {
          continue;
        }

        score += matchedTokens.length * field.weight;
        matchedOn.add(field.label);

        if (snippets.length < 3) {
          snippets.push({
            text: excerptSnippet(field.text, matchedTokens[0]),
            targetKind: field.targetKind,
            targetId: field.targetId,
          });
        }
      }

      if (score === 0) {
        return null;
      }

      return {
        id: item.id,
        name: item.name,
        company: item.company,
        stage: item.stage,
        summary: item.summary,
        followUp: item.followUp,
        tags: item.tags,
        score,
        matchedOn: Array.from(matchedOn),
        snippets: snippets.slice(0, 3),
      };
    })
    .filter((item): item is SearchResultItem => item !== null)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function getFallbackDashboardData(): DashboardData {
  const pipelineCounts = {
    New: demoLeads.filter((lead) => lead.stage === "New").length,
    Qualified: demoLeads.filter((lead) => lead.stage === "Qualified").length,
    Proposal: demoLeads.filter((lead) => lead.stage === "Proposal").length,
    "Follow-up": demoLeads.filter((lead) => lead.stage === "Follow-up").length,
  };

  return {
    metrics: demoMetrics,
    leads: demoLeads.map((lead) => ({
      ...lead,
      sourceValue: parseMockSource(lead.source),
      priorityValue: parseMockPriority(lead.priority),
    })),
    activityFeed,
    semanticMatches,
    pipelineCounts,
    followUpQueue: demoLeads.map((lead, index) => ({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      stage: lead.stage,
      followUp: lead.followUp,
      timing: index === 0 ? "Due today" : "Upcoming",
    })),
  };
}

async function fetchTenantDashboardData(tenantSlug: string): Promise<DashboardData> {
  const prisma = getPrismaClient();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: {
      id: true,
      leads: {
        where: {
          archivedAt: null,
        },
        orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
        include: {
          contact: true,
          leadTags: {
            include: {
              tag: true,
            },
          },
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
      },
      aiGenerations: {
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
    },
  });

  if (!tenant) {
    return getFallbackDashboardData();
  }

  const leadItems: LeadListItem[] = tenant.leads.map((lead) => ({
    id: lead.id,
    name: lead.contact.name,
    company: lead.contact.company ?? "Independent",
    title: lead.title,
    stage: formatLeadStage(lead.stage),
    source: formatSource(lead.source),
    sourceValue: lead.source,
    priority: formatPriority(lead.priority),
    priorityValue: lead.priority,
    lastMessage: lead.conversations[0]?.messages[0]?.content ?? "No messages yet.",
    summary: lead.summary ?? "No AI summary yet.",
    nextAction: lead.nextAction ?? "Review the latest context and send the next best response.",
    followUp: formatFollowUp(lead.followUpAt),
    tags: lead.leadTags.map((entry) => entry.tag.name),
  }));

  const metrics: DashboardMetric[] = [
    {
      label: "Active leads",
      value: String(leadItems.filter((lead) => lead.stage !== "Won" && lead.stage !== "Lost").length),
      detail: `${leadItems.filter((lead) => lead.stage === "Qualified" || lead.stage === "Proposal").length} in active deal stages`,
    },
    {
      label: "Hot opportunities",
      value: String(leadItems.filter((lead) => lead.tags.includes("high intent")).length),
      detail: `${leadItems.filter((lead) => lead.followUp === formatFollowUp(new Date())).length} due today`,
    },
    {
      label: "AI generations",
      value: String(tenant.aiGenerations.length),
      detail: "Latest tagging and summary activity",
    },
    {
      label: "Follow-ups due",
      value: String(leadItems.filter((lead) => lead.followUp !== "Unscheduled").length),
      detail: "Tracked from lead-level next action dates",
    },
  ];

  const pipelineCounts = {
    New: leadItems.filter((lead) => lead.stage === "New").length,
    Qualified: leadItems.filter((lead) => lead.stage === "Qualified").length,
    Proposal: leadItems.filter((lead) => lead.stage === "Proposal").length,
    "Follow-up": leadItems.filter((lead) => lead.stage === "Follow-up").length,
  };

  const followUpQueue = tenant.leads
    .filter((lead) => lead.followUpAt)
    .map((lead) => ({
      id: lead.id,
      name: lead.contact.name,
      company: lead.contact.company ?? "Independent",
      stage: formatLeadStage(lead.stage),
      followUp: formatFollowUp(lead.followUpAt),
      followUpAt: lead.followUpAt,
      timing: getFollowUpTiming(lead.followUpAt),
    }))
    .filter(
      (
        lead,
      ): lead is {
        id: string;
        name: string;
        company: string;
        stage: LeadListItem["stage"];
        followUp: string;
        followUpAt: Date;
        timing: "Overdue" | "Due today" | "Upcoming";
      } => lead.timing !== null,
    )
    .sort((a, b) => a.followUpAt.getTime() - b.followUpAt.getTime())
    .slice(0, 5)
    .map(({ followUpAt: _followUpAt, ...lead }) => lead);

  const aiActivity = tenant.aiGenerations.map((generation) => ({
    id: generation.id,
    title: `${generation.type.replaceAll("_", " ").toLowerCase()} generated`,
    body: generation.outputText,
  }));

  return {
    metrics,
    leads: leadItems,
    activityFeed: aiActivity.length > 0 ? aiActivity : activityFeed,
    semanticMatches,
    pipelineCounts,
    followUpQueue,
  };
}

export async function getDashboardData(tenantSlug = "northstar-studio"): Promise<DashboardData> {
  if (!process.env.DATABASE_URL) {
    return getFallbackDashboardData();
  }

  try {
    return await fetchTenantDashboardData(tenantSlug);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return getFallbackDashboardData();
    }

    throw error;
  }
}

function getFallbackSearchData(query: string): SearchData {
  const searchableLeads = demoLeadDetails.map((lead) => ({
    id: lead.id,
    name: lead.name,
    company: lead.company,
    stage: lead.stage,
    summary: lead.summary,
    followUp: lead.followUp,
    tags: lead.tags,
    searchable: [
      { label: "Lead summary", text: lead.summary, weight: 5 },
      { label: "Tags", text: lead.tags.join(" "), weight: 4 },
      { label: "Messages", text: lead.messages.map((message) => message.content).join(" "), weight: 3 },
      { label: "Notes", text: lead.notes.map((note) => note.content).join(" "), weight: 2 },
      { label: "AI outputs", text: lead.aiOutputs.map((output) => output.body).join(" "), weight: 2 },
      { label: "Company", text: `${lead.company} ${lead.title}`, weight: 3 },
    ],
  }));

  return {
    query,
    results: buildSearchResults(searchableLeads, query),
    suggestions: [
      "healthcare fixed-price estimate",
      "urgent branding project",
      "stalled retainer follow-up",
    ],
    searchedCount: searchableLeads.length,
    answer:
      query.trim().length > 0
        ? {
            text: `Search is ready, but grounded workspace answers require a live database-backed workspace with stored CRM evidence.`,
            citations: [],
          }
        : null,
  };
}

async function fetchTenantSearchData(tenantSlug: string, query: string): Promise<SearchData> {
  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: {
      id: true,
      leads: {
        where: {
          archivedAt: null,
        },
        orderBy: [{ updatedAt: "desc" }],
        include: {
          contact: true,
          leadTags: {
            include: {
              tag: true,
            },
          },
          notes: {
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
            include: {
              embeddings: true,
            },
          },
          conversations: {
            orderBy: {
              lastMessageAt: "desc",
            },
            take: 3,
            include: {
              messages: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 8,
                include: {
                  embeddings: true,
                },
              },
              aiGenerations: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 5,
              },
            },
          },
          aiGenerations: {
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
        },
      },
    },
  });

  if (!tenant) {
    return getFallbackSearchData(query);
  }

  const searchableLeads = tenant.leads.map((lead) => {
    const latestConversation = lead.conversations[0];
    const latestMessage = latestConversation?.messages[0]?.content ?? "No messages yet.";

    return {
      id: lead.id,
      name: lead.contact.name,
      company: lead.contact.company ?? "Independent",
      stage: formatLeadStage(lead.stage),
      summary: lead.summary ?? latestMessage,
      followUp: formatFollowUp(lead.followUpAt),
      tags: lead.leadTags.map((entry) => entry.tag.name),
      searchable: [
        { label: "Lead summary", text: lead.summary ?? "", weight: 5 },
        { label: "Tags", text: lead.leadTags.map((entry) => entry.tag.name).join(" "), weight: 4 },
        ...lead.conversations.flatMap((conversation) =>
          conversation.messages.map((message) => ({
            label: "Messages",
            text: message.content,
            weight: 3,
            targetKind: "message" as const,
            targetId: message.id,
          })),
        ),
        ...lead.notes.map((note) => ({
          label: "Notes",
          text: note.content,
          weight: 2,
          targetKind: "note" as const,
          targetId: note.id,
        })),
        ...lead.aiGenerations.map((output) => ({
          label: "AI outputs",
          text: output.outputText,
          weight: 2,
          targetKind: "ai" as const,
          targetId: output.id,
        })),
        ...lead.conversations.flatMap((conversation) =>
          conversation.aiGenerations.map((output) => ({
            label: "AI outputs",
            text: output.outputText,
            weight: 2,
            targetKind: "ai" as const,
            targetId: output.id,
          })),
        ),
        {
          label: "Contact",
          text: [lead.contact.name, lead.contact.company, lead.title].filter(Boolean).join(" "),
          weight: 3,
        },
      ],
    };
  });

  const keywordResults = buildSearchResults(searchableLeads, query);
  const semanticQuery = query.trim();

  if (!semanticQuery) {
    return {
      query,
      results: keywordResults,
      suggestions: [
        "budget confirmed healthcare",
        "branding before June",
        "quiet lead retainer options",
      ],
      searchedCount: searchableLeads.length,
      answer: null,
    };
  }

  const queryEmbedding = await generateSearchEmbedding(semanticQuery);
  const leadById = new Map(tenant.leads.map((lead) => [lead.id, lead] as const));

  let semanticResults: SearchResultItem[] = [];

  try {
    const semanticMatches = await fetchPgvectorSemanticMatches({
      tenantId: tenant.id,
      queryEmbedding,
      limit: 12,
    });

    const mappedSemanticResults = semanticMatches.map(
      (match): SearchResultItem | null => {
        const lead = leadById.get(match.leadId);

        if (!lead) {
          return null;
        }

        const latestConversation = lead.conversations[0];
        const latestMessage = latestConversation?.messages[0]?.content ?? "No messages yet.";

        return {
          id: lead.id,
          name: lead.contact.name,
          company: lead.contact.company ?? "Independent",
          stage: formatLeadStage(lead.stage),
          summary: lead.summary ?? latestMessage,
          followUp: formatFollowUp(lead.followUpAt),
          tags: lead.leadTags.map((entry) => entry.tag.name),
          score: Math.round(match.similarity * 100),
          matchedOn: ["Semantic memory"],
          snippets: [
            {
              text: excerptSnippet(match.messageContent),
              targetKind: "message",
              targetId: match.messageId,
            },
          ],
        } satisfies SearchResultItem;
      },
    );

    semanticResults = mappedSemanticResults.filter(
      (item): item is SearchResultItem => item !== null,
    );
  } catch {
    const fallbackSemanticResults = tenant.leads.map(
      (lead): SearchResultItem | null => {
        const leadMessages = lead.conversations.flatMap((conversation) =>
          conversation.messages.map((message) => ({
            id: message.id,
            content: message.content,
            embedding: message.embeddings[0]?.vector,
          })),
        );

        const rankedMessages = leadMessages
          .map((message) => ({
            ...message,
            similarity: Array.isArray(message.embedding)
              ? cosineSimilarity(
                  queryEmbedding,
                  message.embedding.filter((value): value is number => typeof value === "number"),
                )
              : 0,
          }))
          .sort((a, b) => b.similarity - a.similarity);

        const bestMatch = rankedMessages[0];

        if (!bestMatch || bestMatch.similarity < 0.55) {
          return null;
        }

        const latestConversation = lead.conversations[0];
        const latestMessage = latestConversation?.messages[0]?.content ?? "No messages yet.";

        return {
          id: lead.id,
          name: lead.contact.name,
          company: lead.contact.company ?? "Independent",
          stage: formatLeadStage(lead.stage),
          summary: lead.summary ?? latestMessage,
          followUp: formatFollowUp(lead.followUpAt),
          tags: lead.leadTags.map((entry) => entry.tag.name),
          score: Math.round(bestMatch.similarity * 100),
          matchedOn: ["Semantic memory"],
          snippets: [
            {
              text: excerptSnippet(bestMatch.content),
              targetKind: "message",
              targetId: bestMatch.id,
            },
          ],
        } satisfies SearchResultItem;
      },
    );

    semanticResults = fallbackSemanticResults.filter(
      (item): item is SearchResultItem => item !== null,
    );
  }

  const groundedEvidence = tenant.leads
    .flatMap((lead) => [
      ...lead.conversations.flatMap((conversation) =>
        conversation.messages.map((message) => ({
          leadId: lead.id,
          leadName: lead.contact.name,
          label: "Message",
          quote: message.content,
          targetKind: "message" as const,
          targetId: message.id,
          embedding: message.embeddings[0]?.vector,
        })),
      ),
      ...lead.notes.map((note) => ({
        leadId: lead.id,
        leadName: lead.contact.name,
        label: "Note",
        quote: note.content,
        targetKind: "note" as const,
        targetId: note.id,
        embedding: note.embeddings[0]?.vector,
      })),
    ])
    .map((item) => ({
      ...item,
      similarity: Array.isArray(item.embedding)
        ? cosineSimilarity(
            queryEmbedding,
            item.embedding.filter((value): value is number => typeof value === "number"),
          )
        : 0,
    }))
    .filter((item) => item.similarity >= 0.35)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4)
    .map(
      (item): GroundedAnswerCitation => ({
        leadId: item.leadId,
        leadName: item.leadName,
        label: item.label,
        quote: excerptSnippet(item.quote),
        targetKind: item.targetKind,
        targetId: item.targetId,
      }),
    );

  const answer =
    groundedEvidence.length > 0
      ? {
          text: await generateGroundedSearchAnswer({
            tenantId: tenant.id,
            query,
            evidence: groundedEvidence.map((item) => ({
              label: `${item.label} from ${item.leadName}`,
              quote: item.quote,
            })),
          }),
          citations: groundedEvidence,
        }
      : null;

  return {
    query,
    results: mergeSearchResults(keywordResults, semanticResults),
    suggestions: [
      "budget confirmed healthcare",
      "branding before June",
      "quiet lead retainer options",
    ],
    searchedCount: searchableLeads.length,
    answer,
  };
}

export async function getSearchData(
  tenantSlug: string,
  query: string,
): Promise<SearchData> {
  if (!process.env.DATABASE_URL) {
    return getFallbackSearchData(query);
  }

  try {
    return await fetchTenantSearchData(tenantSlug, query);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return getFallbackSearchData(query);
    }

    throw error;
  }
}

export async function getLeadDetail(
  tenantSlug: string,
  leadId: string,
): Promise<LeadDetailData | null> {
  if (!process.env.DATABASE_URL) {
    const lead = demoLeadDetails.find((entry) => entry.id === leadId);

    if (!lead) {
      return null;
    }

    return {
      ...lead,
      sourceValue: parseMockSource(lead.source),
      priorityValue: parseMockPriority(lead.priority),
      followUpDateValue: "",
      tagsValue: lead.tags.join(", "),
      tagSuggestions: Array.from(new Set(demoLeads.flatMap((entry) => entry.tags))).sort(),
      messages: lead.messages.map((message, index) => ({
        ...message,
        createdAtValue: buildFallbackTimestamp(24 + index),
      })),
      notes: lead.notes.map((note, index) => ({
        ...note,
        createdAtValue: buildFallbackTimestamp(12 + index),
      })),
      aiOutputs: lead.aiOutputs.map((output, index) => ({
        ...output,
        createdAt: index === 0 ? "Today" : "Recently",
        createdAtValue: buildFallbackTimestamp(index),
      })),
      similarLeads: demoLeadDetails
        .filter((entry) => entry.id !== lead.id)
        .slice(0, 2)
        .map((entry, index) => ({
          id: entry.id,
          name: entry.name,
          company: entry.company,
          stage: entry.stage,
          score: 78 - index * 9,
          summary: entry.summary,
          matchedExcerpt: entry.messages[0]?.content ?? entry.summary,
          tags: entry.tags,
        })),
      isArchived: false,
    };
  }

  try {
    const prisma = getPrismaClient();
    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        tenant: {
          slug: tenantSlug,
        },
      },
      include: {
        tenant: {
          select: {
            tags: {
              orderBy: {
                name: "asc",
              },
              select: {
                name: true,
              },
            },
          },
        },
        contact: true,
        leadTags: {
          include: {
            tag: true,
          },
        },
        notes: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            author: true,
          },
        },
        conversations: {
          orderBy: {
            lastMessageAt: "desc",
          },
          include: {
            messages: {
              orderBy: {
                createdAt: "asc",
              },
              include: {
                embeddings: true,
              },
            },
            aiGenerations: {
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
        aiGenerations: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!lead) {
      return null;
    }

    const conversation = lead.conversations[0];
    const currentLeadMessages = lead.conversations.flatMap((currentConversation) =>
      currentConversation.messages.map((message) => ({
        id: message.id,
        content: message.content,
        embedding: message.embeddings[0]?.vector,
      })),
    );
    const combinedOutputs = Array.from(
      new Map(
        [...lead.aiGenerations, ...(conversation?.aiGenerations ?? [])].map((output) => [
          output.id,
          output,
        ]),
      ).values(),
    );
    const leadQueryEmbedding = currentLeadMessages
      .map((message) =>
        Array.isArray(message.embedding)
          ? message.embedding.filter((value): value is number => typeof value === "number")
          : [],
      )
      .find((vector) => vector.length > 0) ?? [];
    const similarCandidateLeads =
      leadQueryEmbedding.length > 0
        ? await prisma.lead.findMany({
            where: {
              tenant: {
                slug: tenantSlug,
              },
              id: {
                not: lead.id,
              },
              archivedAt: null,
            },
            include: {
              contact: true,
              leadTags: {
                include: {
                  tag: true,
                },
              },
              conversations: {
                orderBy: {
                  lastMessageAt: "desc",
                },
                take: 3,
                include: {
                  messages: {
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 8,
                    include: {
                      embeddings: true,
                    },
                  },
                },
              },
            },
            take: 12,
          })
        : [];
    const similarLeads = similarCandidateLeads
      .map((candidate) => {
        const rankedMessages = candidate.conversations
          .flatMap((candidateConversation) => candidateConversation.messages)
          .map((message) => ({
            content: message.content,
            similarity: Array.isArray(message.embeddings[0]?.vector)
              ? cosineSimilarity(
                  leadQueryEmbedding,
                  message.embeddings[0].vector.filter(
                    (value): value is number => typeof value === "number",
                  ),
                )
              : 0,
          }))
          .sort((left, right) => right.similarity - left.similarity);

        const bestMatch = rankedMessages[0];

        if (!bestMatch || bestMatch.similarity < 0.45) {
          return null;
        }

        return {
          id: candidate.id,
          name: candidate.contact.name,
          company: candidate.contact.company ?? "Independent",
          stage: formatLeadStage(candidate.stage),
          score: Math.round(bestMatch.similarity * 100),
          summary:
            candidate.summary ??
            candidate.conversations[0]?.messages[0]?.content ??
            "No summary yet.",
          matchedExcerpt: excerptSnippet(bestMatch.content),
          tags: candidate.leadTags.map((entry) => entry.tag.name),
        };
      })
      .filter(
        (
          item,
        ): item is {
          id: string;
          name: string;
          company: string;
          stage: "New" | "Qualified" | "Proposal" | "Follow-up" | "Won" | "Lost";
          score: number;
          summary: string;
          matchedExcerpt: string;
          tags: string[];
        } => item !== null,
      )
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    return {
      id: lead.id,
      name: lead.contact.name,
      email: lead.contact.email,
      phone: lead.contact.phone ?? "No phone saved",
      industry: lead.contact.industry ?? "No industry saved",
      website: lead.contact.website ?? "No website saved",
      companyNotes: lead.contact.companyNotes ?? "No company notes saved yet.",
      company: lead.contact.company ?? "Independent",
      title: lead.title,
      stage: formatLeadStage(lead.stage),
      source: formatSource(lead.source),
      sourceValue: lead.source,
      priority: formatPriority(lead.priority),
      priorityValue: lead.priority,
      summary: lead.summary ?? "No AI summary yet.",
      followUp: formatFollowUp(lead.followUpAt),
      followUpDateValue: formatDateInputValue(lead.followUpAt),
      nextAction:
        lead.nextAction ?? "Review the latest context and send the next reply draft.",
      tagsValue: lead.leadTags.map((entry) => entry.tag.name).join(", "),
      tagSuggestions: lead.tenant.tags.map((tag) => tag.name),
      tags: lead.leadTags.map((entry) => entry.tag.name),
      messages:
        conversation?.messages.map((message) => ({
          id: message.id,
          direction: message.direction,
          content: message.content,
          createdAt: formatFollowUp(message.createdAt),
          createdAtValue: message.createdAt.toISOString(),
        })) ?? [],
      notes: lead.notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: formatFollowUp(note.createdAt),
        createdAtValue: note.createdAt.toISOString(),
        author: note.author?.name ?? "Workspace member",
      })),
      aiOutputs: combinedOutputs.map((output) => ({
        id: output.id,
        label: output.type.replaceAll("_", " ").toLowerCase(),
        body: output.outputText,
        createdAt: formatFollowUp(output.createdAt),
        createdAtValue: output.createdAt.toISOString(),
      })),
      similarLeads,
      isArchived: Boolean(lead.archivedAt),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      const lead = demoLeadDetails.find((entry) => entry.id === leadId);

      if (!lead) {
        return null;
      }

      return {
        ...lead,
        sourceValue: parseMockSource(lead.source),
        priorityValue: parseMockPriority(lead.priority),
        followUpDateValue: "",
        tagsValue: lead.tags.join(", "),
        tagSuggestions: Array.from(new Set(demoLeads.flatMap((entry) => entry.tags))).sort(),
        messages: lead.messages.map((message, index) => ({
          ...message,
          createdAtValue: buildFallbackTimestamp(24 + index),
        })),
        notes: lead.notes.map((note, index) => ({
          ...note,
          createdAtValue: buildFallbackTimestamp(12 + index),
        })),
        aiOutputs: lead.aiOutputs.map((output, index) => ({
          ...output,
          createdAt: index === 0 ? "Today" : "Recently",
          createdAtValue: buildFallbackTimestamp(index),
        })),
        similarLeads: demoLeadDetails
          .filter((entry) => entry.id !== lead.id)
          .slice(0, 2)
          .map((entry, index) => ({
            id: entry.id,
            name: entry.name,
            company: entry.company,
            stage: entry.stage,
            score: 78 - index * 9,
            summary: entry.summary,
            matchedExcerpt: entry.messages[0]?.content ?? entry.summary,
            tags: entry.tags,
          })),
        isArchived: false,
      };
    }

    throw error;
  }
}
