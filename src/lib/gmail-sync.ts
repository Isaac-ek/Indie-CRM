import { LeadPriority, LeadSource, LeadStage, MailProvider, MessageDirection } from "@/generated/prisma/client";
import { generateLeadIntelligence, upsertMessageEmbedding } from "@/lib/ai";
import { createOperationalEvent } from "@/lib/operational-events";
import { getPrismaClient } from "@/lib/prisma";

type GmailTokenResponse = {
  access_token: string;
};

type GmailListResponse = {
  messages?: Array<{ id: string }>;
};

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessageResponse = {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Gmail sync.`);
  }

  return value;
}

function getHeader(headers: GmailHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function parseMailbox(value: string | null) {
  if (!value) {
    return {
      email: null,
      name: null,
    };
  }

  const match = value.match(/^(.*)<([^>]+)>$/);

  if (!match) {
    const email = value.trim().toLowerCase();
    return {
      email: email.includes("@") ? email : null,
      name: email.includes("@") ? email.split("@")[0] : value.trim(),
    };
  }

  return {
    name: match[1]?.trim().replace(/^"|"$/g, "") || null,
    email: match[2]?.trim().toLowerCase() || null,
  };
}

function parseInternalDate(value: string | undefined) {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isNaN(parsed) ? new Date() : new Date(parsed);
}

async function fetchGmailAccessToken(refreshToken: string) {
  const clientId = requiredEnv("GMAIL_CLIENT_ID");
  const clientSecret = requiredEnv("GMAIL_CLIENT_SECRET");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not refresh Gmail access token.");
  }

  const data = (await response.json()) as GmailTokenResponse;
  return data.access_token;
}

async function fetchRecentGmailMessages(accessToken: string, maxResults = 10) {
  const listResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=${maxResults}`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!listResponse.ok) {
    throw new Error("Could not list Gmail messages.");
  }

  const listData = (await listResponse.json()) as GmailListResponse;
  const messageIds = listData.messages?.map((message) => message.id) ?? [];

  const messages = await Promise.all(
    messageIds.map(async (messageId) => {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`Could not load Gmail message ${messageId}.`);
      }

      return (await response.json()) as GmailMessageResponse;
    }),
  );

  return messages;
}

async function importGmailMessage(params: {
  tenantId: string;
  workspaceUserId: string | null;
  gmailMessage: GmailMessageResponse;
}) {
  const prisma = getPrismaClient();
  const headers = params.gmailMessage.payload?.headers;
  const from = parseMailbox(getHeader(headers, "From"));
  const subject = getHeader(headers, "Subject")?.trim() || "Gmail inquiry";
  const content = params.gmailMessage.snippet?.trim() || subject;

  if (!from.email) {
    return { imported: false, reason: "missing_sender" } as const;
  }

  const existingMessage = await prisma.message.findUnique({
    where: {
      externalMessageId: params.gmailMessage.id,
    },
    select: {
      id: true,
    },
  });

  if (existingMessage) {
    return { imported: false, reason: "duplicate" } as const;
  }

  const receivedAt = parseInternalDate(params.gmailMessage.internalDate);
  const contact = await prisma.contact.upsert({
    where: {
      tenantId_email: {
        tenantId: params.tenantId,
        email: from.email,
      },
    },
    update: {
      name: from.name ?? from.email,
    },
    create: {
      tenantId: params.tenantId,
      email: from.email,
      name: from.name ?? from.email,
    },
  });

  let lead = await prisma.lead.findFirst({
    where: {
      tenantId: params.tenantId,
      contactId: contact.id,
      stage: {
        notIn: [LeadStage.WON, LeadStage.LOST],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  let isNewLead = false;

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        tenantId: params.tenantId,
        contactId: contact.id,
        createdById: params.workspaceUserId,
        title: subject,
        source: LeadSource.EMAIL,
        priority: LeadPriority.MEDIUM,
        stage: LeadStage.NEW,
        summary: content,
        lastContactAt: receivedAt,
        followUpAt: new Date(receivedAt.getTime() + 1000 * 60 * 60 * 24 * 2),
      },
    });
    isNewLead = true;
  }

  const conversation =
    (await prisma.conversation.findFirst({
      where: {
        tenantId: params.tenantId,
        leadId: lead.id,
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    })) ??
    (await prisma.conversation.create({
      data: {
        tenantId: params.tenantId,
        contactId: contact.id,
        leadId: lead.id,
        subject,
        channel: "gmail",
        lastMessageAt: receivedAt,
      },
    }));

  const message = await prisma.message.create({
    data: {
      tenantId: params.tenantId,
      conversationId: conversation.id,
      externalMessageId: params.gmailMessage.id,
      source: "gmail",
      direction: MessageDirection.INBOUND,
      subject,
      content,
      createdAt: receivedAt,
      updatedAt: receivedAt,
    },
  });

  await upsertMessageEmbedding({
    tenantId: params.tenantId,
    messageId: message.id,
    content,
  });

  await prisma.conversation.update({
    where: {
      id: conversation.id,
    },
    data: {
      subject,
      channel: "gmail",
      lastMessageAt: receivedAt,
    },
  });

  await prisma.lead.update({
    where: {
      id: lead.id,
    },
    data: {
      title: lead.title || subject,
      source: LeadSource.EMAIL,
      lastContactAt: receivedAt,
      summary: lead.summary ?? content,
    },
  });

  if (isNewLead) {
    await generateLeadIntelligence({
      tenantId: params.tenantId,
      leadId: lead.id,
      requestedById: params.workspaceUserId,
      contactName: contact.name,
      company: contact.company,
      inquiry: content,
    });
  }

  return { imported: true, leadId: lead.id } as const;
}

export async function syncWorkspaceGmailInbox(params: {
  tenantId: string;
  requestedById: string | null;
  limit?: number;
}) {
  const prisma = getPrismaClient();
  const connection = await prisma.mailboxConnection.findFirst({
    where: {
      tenantId: params.tenantId,
      provider: MailProvider.GMAIL,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!connection) {
    throw new Error("Connect Gmail before running sync.");
  }

  try {
    const startedAt = new Date();
    const accessToken = await fetchGmailAccessToken(connection.refreshToken);
    const messages = await fetchRecentGmailMessages(accessToken, params.limit ?? 10);

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const failureSamples: string[] = [];

    for (const gmailMessage of messages) {
      try {
        const result = await importGmailMessage({
          tenantId: params.tenantId,
          workspaceUserId: params.requestedById,
          gmailMessage,
        });

        if (result.imported) {
          imported += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        const failureMessage =
          error instanceof Error ? error.message : `Message ${gmailMessage.id} failed.`;
        if (failureSamples.length < 3) {
          failureSamples.push(failureMessage);
        }
        await createOperationalEvent({
          tenantId: params.tenantId,
          source: "gmail.message_import",
          message: failureMessage,
          metadata: {
            messageId: gmailMessage.id,
            requestedById: params.requestedById,
          },
        });
      }
    }

    await prisma.mailboxConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        lastSyncAttemptAt: startedAt,
        lastSyncedAt: new Date(),
        consecutiveFailures: 0,
        lastError:
          failed > 0
            ? `${failed} Gmail message(s) failed during the latest sync. ${failureSamples.join(" ")}`
            : null,
      },
    });

    return {
      imported,
      skipped,
      failed,
      attempted: messages.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail sync failed.";

    await prisma.mailboxConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        lastSyncAttemptAt: new Date(),
        consecutiveFailures: {
          increment: 1,
        },
        lastError: message,
      },
    });

    await createOperationalEvent({
      tenantId: params.tenantId,
      source: "gmail.sync",
      message,
      metadata: {
        requestedById: params.requestedById,
        provider: MailProvider.GMAIL,
      },
    });

    throw error;
  }
}
