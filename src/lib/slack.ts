import { getPrismaClient } from "@/lib/prisma";

export type SlackLeadContext = {
  leadId: string;
  workspaceSlug: string;
  title: string;
  contactName: string;
  contactEmail: string;
  company?: string | null;
  stage: string;
  priority: string;
  score?: number | null;
  summary?: string | null;
  appBaseUrl?: string;
};

export type SlackBlock = {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text: {
      type: string;
      text: string;
      emoji?: boolean;
    };
    url?: string;
    style?: string;
  }>;
};

export type SlackWebhookPayload = {
  text: string;
  blocks?: SlackBlock[];
};

/**
 * Formats a rich Slack Block Kit payload for a hot lead alert.
 */
export function formatHotLeadSlackPayload(context: SlackLeadContext): SlackWebhookPayload {
  const baseUrl = context.appBaseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const leadUrl = `${baseUrl}/w/${context.workspaceSlug}/leads/${context.leadId}`;
  const companyInfo = context.company ? ` (${context.company})` : "";
  const scoreText = context.score !== undefined && context.score !== null ? `${context.score}/100` : "N/A";

  const fallbackText = `🔥 Hot Lead Alert: ${context.title} for ${context.contactName}${companyInfo}`;

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🔥 Hot Lead Alert: ${context.title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Contact:*\n${context.contactName}${companyInfo}`,
        },
        {
          type: "mrkdwn",
          text: `*Email:*\n${context.contactEmail}`,
        },
        {
          type: "mrkdwn",
          text: `*Stage:*\n\`${context.stage}\``,
        },
        {
          type: "mrkdwn",
          text: `*Priority:*\n\`${context.priority}\``,
        },
        {
          type: "mrkdwn",
          text: `*Lead Score:*\n\`${scoreText}\``,
        },
        {
          type: "mrkdwn",
          text: `*Workspace:*\n\`${context.workspaceSlug}\``,
        },
      ],
    },
  ];

  if (context.summary) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*AI Summary:*\n_${context.summary}_`,
      },
    });
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "View Lead in Indie CRM",
          emoji: true,
        },
        url: leadUrl,
        style: "primary",
      },
    ],
  });

  return {
    text: fallbackText,
    blocks,
  };
}

/**
 * Sends a Slack notification via Incoming Webhook URL.
 */
export async function sendSlackWebhook(
  webhookUrl: string,
  payload: SlackWebhookPayload,
  fetchFn: typeof fetch = fetch
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, error: "Missing Slack Webhook URL" };
  }

  try {
    const response = await fetchFn(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      return {
        success: false,
        statusCode: response.status,
        error: `Slack webhook returned HTTP ${response.status}: ${responseText}`,
      };
    }

    return { success: true, statusCode: response.status };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Slack webhook request failed: ${errorMessage}` };
  }
}

/**
 * Dispatches a Slack hot lead notification and records an operational log event if DB is available.
 */
export async function notifyHotLeadSlack(
  tenantId: string,
  webhookUrl: string,
  context: SlackLeadContext,
  fetchFn?: typeof fetch
): Promise<{ success: boolean; error?: string }> {
  const payload = formatHotLeadSlackPayload(context);
  const result = await sendSlackWebhook(webhookUrl, payload, fetchFn);

  // Log operational event if DB available
  try {
    const prisma = getPrismaClient();
    await prisma.operationalEvent.create({
      data: {
        tenantId,
        source: "slack.alert",
        level: result.success ? "INFO" : "ERROR",
        message: result.success
          ? `Dispatched Slack hot lead alert for lead [${context.title}]`
          : `Failed to dispatch Slack alert: ${result.error}`,
        metadata: {
          leadId: context.leadId,
          score: context.score,
          priority: context.priority,
          success: result.success,
          error: result.error,
        },
      },
    });
  } catch {
    // DB logging is non-blocking
  }

  return result;
}
