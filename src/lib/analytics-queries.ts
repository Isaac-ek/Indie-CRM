import { LeadPriority, LeadStage } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspaces";

export type WorkspaceAnalyticsData = {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  closeRatePercentage: number;
  avgLeadScore: number;
  stageBreakdown: Array<{ stage: string; count: number; percentage: number }>;
  sourceBreakdown: Array<{ source: string; count: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
  aiGenerationsCount: number;
  totalMessagesCount: number;
  recentActivityLogsCount: number;
};

/**
 * Calculates analytics and performance metrics for a workspace.
 */
export async function getWorkspaceAnalytics(
  workspaceSlug: string
): Promise<WorkspaceAnalyticsData> {
  const workspace = await getWorkspaceContext(workspaceSlug);

  // Return fallback demo statistics if workspace is in demo mode or DB unavailable
  if (workspace.mode !== "database" || !workspace.id) {
    return {
      totalLeads: 12,
      activeLeads: 8,
      wonLeads: 3,
      lostLeads: 1,
      closeRatePercentage: 75,
      avgLeadScore: 82,
      stageBreakdown: [
        { stage: "NEW", count: 3, percentage: 25 },
        { stage: "QUALIFIED", count: 3, percentage: 25 },
        { stage: "PROPOSAL", count: 2, percentage: 17 },
        { stage: "WON", count: 3, percentage: 25 },
        { stage: "LOST", count: 1, percentage: 8 },
      ],
      sourceBreakdown: [
        { source: "FORM", count: 5 },
        { source: "EMAIL", count: 4 },
        { source: "REFERRAL", count: 2 },
        { source: "MANUAL", count: 1 },
      ],
      priorityBreakdown: [
        { priority: "URGENT", count: 2 },
        { priority: "HIGH", count: 5 },
        { priority: "MEDIUM", count: 4 },
        { priority: "LOW", count: 1 },
      ],
      aiGenerationsCount: 24,
      totalMessagesCount: 38,
      recentActivityLogsCount: 42,
    };
  }

  const prisma = getPrismaClient();
  const tenantId = workspace.id;

  const [
    leads,
    aiGenerationsCount,
    totalMessagesCount,
    recentActivityLogsCount,
  ] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId, archivedAt: null },
      select: {
        id: true,
        stage: true,
        source: true,
        priority: true,
        score: true,
      },
    }),
    prisma.aIGeneration.count({ where: { tenantId } }),
    prisma.message.count({ where: { tenantId } }),
    prisma.auditLog.count({ where: { tenantId } }),
  ]);

  const totalLeads = leads.length;
  const wonLeads = leads.filter((l) => l.stage === LeadStage.WON).length;
  const lostLeads = leads.filter((l) => l.stage === LeadStage.LOST).length;
  const activeLeads = totalLeads - wonLeads - lostLeads;

  const closedTotal = wonLeads + lostLeads;
  const closeRatePercentage = closedTotal > 0 ? Math.round((wonLeads / closedTotal) * 100) : 0;

  const scores = leads.map((l) => l.score).filter((s): s is number => s !== null && s !== undefined);
  const avgLeadScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const stageCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};

  for (const lead of leads) {
    stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
    sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
    priorityCounts[lead.priority] = (priorityCounts[lead.priority] || 0) + 1;
  }

  const stageBreakdown = Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
    percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
  }));

  const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({
    source,
    count,
  }));

  const priorityBreakdown = Object.entries(priorityCounts).map(([priority, count]) => ({
    priority,
    count,
  }));

  return {
    totalLeads,
    activeLeads,
    wonLeads,
    lostLeads,
    closeRatePercentage,
    avgLeadScore,
    stageBreakdown,
    sourceBreakdown,
    priorityBreakdown,
    aiGenerationsCount,
    totalMessagesCount,
    recentActivityLogsCount,
  };
}

export type AuditLogEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  actorName: string;
  actorEmail?: string | null;
  createdAt: string;
};

/**
 * Retrieves audit logs for the workspace with fallback demo entries.
 */
export async function getWorkspaceAuditLogs(
  workspaceSlug: string,
  limit: number = 10
): Promise<AuditLogEntry[]> {
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.mode !== "database" || !workspace.id) {
    return [
      {
        id: "audit-demo-1",
        action: "LEAD_CREATED",
        targetType: "LEAD",
        targetId: "lead-card-01",
        summary: "Ingested new lead via Vision AI: 'Sarah Jenkins - Luminary Creative Studio' (Score: 86)",
        actorName: "AI Vision Pipeline",
        actorEmail: "vision-pipeline@indiecrm.internal",
        createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: "audit-demo-2",
        action: "WEBHOOK_QUEUE_PROCESSED",
        targetType: "WEBHOOK",
        targetId: "wh-evt-88",
        summary: "Processed inbound form webhook for 'Alex Rivera' with HMAC signature verification",
        actorName: "Queue Worker",
        actorEmail: "queue-worker@indiecrm.internal",
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: "audit-demo-3",
        action: "LEAD_WORKFLOW_UPDATED",
        targetType: "LEAD",
        targetId: "lead-2",
        summary: "Updated lead stage to QUALIFIED and triggered Slack Block Kit alert",
        actorName: "Alex Solo",
        actorEmail: "operator@indiecrm.test",
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      },
      {
        id: "audit-demo-4",
        action: "NOTE_CREATED",
        targetType: "NOTE",
        targetId: "note-14",
        summary: "Created voice note transcription and generated pgvector embedding",
        actorName: "Alex Solo",
        actorEmail: "operator@indiecrm.test",
        createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      },
      {
        id: "audit-demo-5",
        action: "MEMBER_INVITED",
        targetType: "MEMBERSHIP",
        targetId: "inv-99",
        summary: "Invited 'taylor.growth@company.test' with role ADMIN",
        actorName: "Alex Solo",
        actorEmail: "operator@indiecrm.test",
        createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
      },
    ];
  }

  const prisma = getPrismaClient();
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actorUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    summary: log.summary,
    actorName: log.actorUser?.name || "System Service",
    actorEmail: log.actorUser?.email || null,
    createdAt: log.createdAt.toISOString(),
  }));
}

/**
 * Generates CSV export content for workspace leads.
 */
export async function generateWorkspaceLeadsCsv(workspaceSlug: string): Promise<string> {
  const workspace = await getWorkspaceContext(workspaceSlug);

  const headers = [
    "ID",
    "Title",
    "Stage",
    "Priority",
    "Score",
    "Source",
    "Contact Name",
    "Contact Email",
    "Contact Phone",
    "Company",
    "Created At",
  ];

  if (workspace.mode !== "database" || !workspace.id) {
    const demoRows = [
      [
        "lead-demo-1",
        "Luminary Creative Studio - Brand Retainer",
        "QUALIFIED",
        "HIGH",
        "86",
        "IMAGE_SCAN",
        "Sarah Jenkins",
        "sarah.jenkins@luminarybrand.test",
        "+1 (555) 839-2041",
        "Luminary Creative Studio",
        new Date().toISOString(),
      ],
      [
        "lead-demo-2",
        "HyperGrowth Labs - Strategy Roadmap",
        "PROPOSAL",
        "HIGH",
        "78",
        "FORM",
        "Alex Rivera",
        "alex.rivera@hypergrowth-labs.test",
        "+1 (555) 482-9011",
        "HyperGrowth Labs",
        new Date().toISOString(),
      ],
      [
        "lead-demo-3",
        "BioHealth Innovations - Clinical Intake",
        "NEW",
        "URGENT",
        "92",
        "IMAGE_SCAN",
        "Dr. Marcus Vance",
        "m.vance@biohealth-innovations.test",
        "+1 (555) 723-1490",
        "BioHealth Innovations",
        new Date().toISOString(),
      ],
    ];

    const csvLines = [headers.join(",")];
    for (const row of demoRows) {
      csvLines.push(row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","));
    }
    return csvLines.join("\n");
  }

  const prisma = getPrismaClient();
  const leads = await prisma.lead.findMany({
    where: { tenantId: workspace.id, archivedAt: null },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
  });

  const csvLines = [headers.join(",")];
  for (const lead of leads) {
    const row = [
      lead.id,
      lead.title,
      lead.stage,
      lead.priority,
      lead.score !== null ? String(lead.score) : "N/A",
      lead.source,
      lead.contact?.name || "",
      lead.contact?.email || "",
      lead.contact?.phone || "",
      lead.contact?.company || "",
      lead.createdAt.toISOString(),
    ];
    csvLines.push(row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));
  }

  return csvLines.join("\n");
}

