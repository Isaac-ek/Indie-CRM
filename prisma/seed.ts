import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AIGenerationType,
  LeadPriority,
  LeadSource,
  LeadStage,
  MembershipRole,
  MessageDirection,
  PrismaClient,
} from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before running the seed script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

type SeedLead = {
  key: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  industry: string;
  website: string;
  companyNotes: string;
  title: string;
  source: LeadSource;
  priority: LeadPriority;
  stage: LeadStage;
  summary: string;
  nextAction: string;
  followUpAt: Date | null;
  lastContactAt: Date;
  channel: string;
  subject: string;
  tags: string[];
  note: string;
  messages: {
    key: string;
    direction: MessageDirection;
    content: string;
    subject?: string;
    source?: string;
  }[];
  generations: {
    key: string;
    type: AIGenerationType;
    model: string;
    promptVersion: string;
    inputSummary: string;
    outputText: string;
  }[];
};

async function seedWorkspaceLead(args: {
  tenantId: string;
  ownerId: string;
  tagsByName: Map<string, { id: string }>;
  lead: SeedLead;
}) {
  const { tenantId, ownerId, tagsByName, lead } = args;

  const contact = await prisma.contact.upsert({
    where: {
      tenantId_email: {
        tenantId,
        email: lead.email,
      },
    },
    update: {
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      industry: lead.industry,
      website: lead.website,
      companyNotes: lead.companyNotes,
    },
    create: {
      tenantId,
      email: lead.email,
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      industry: lead.industry,
      website: lead.website,
      companyNotes: lead.companyNotes,
    },
  });

  const leadRecord = await prisma.lead.upsert({
    where: {
      id: `${tenantId}-${lead.key}-lead`,
    },
    update: {
      title: lead.title,
      source: lead.source,
      priority: lead.priority,
      stage: lead.stage,
      summary: lead.summary,
      nextAction: lead.nextAction,
      followUpAt: lead.followUpAt,
      lastContactAt: lead.lastContactAt,
      archivedAt: null,
    },
    create: {
      id: `${tenantId}-${lead.key}-lead`,
      tenantId,
      contactId: contact.id,
      createdById: ownerId,
      title: lead.title,
      source: lead.source,
      priority: lead.priority,
      stage: lead.stage,
      summary: lead.summary,
      nextAction: lead.nextAction,
      followUpAt: lead.followUpAt,
      lastContactAt: lead.lastContactAt,
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: {
      id: `${leadRecord.id}-conversation`,
    },
    update: {
      subject: lead.subject,
      channel: lead.channel,
      lastMessageAt: lead.lastContactAt,
    },
    create: {
      id: `${leadRecord.id}-conversation`,
      tenantId,
      contactId: contact.id,
      leadId: leadRecord.id,
      subject: lead.subject,
      channel: lead.channel,
      lastMessageAt: lead.lastContactAt,
    },
  });

  for (const message of lead.messages) {
    await prisma.message.upsert({
      where: {
        id: `${conversation.id}-${message.key}`,
      },
      update: {
        direction: message.direction,
        subject: message.subject,
        source: message.source,
        content: message.content,
      },
      create: {
        id: `${conversation.id}-${message.key}`,
        tenantId,
        conversationId: conversation.id,
        authorId: message.direction === MessageDirection.OUTBOUND ? ownerId : null,
        direction: message.direction,
        subject: message.subject,
        source: message.source,
        content: message.content,
      },
    });
  }

  await prisma.note.upsert({
    where: {
      id: `${leadRecord.id}-note`,
    },
    update: {
      content: lead.note,
    },
    create: {
      id: `${leadRecord.id}-note`,
      tenantId,
      leadId: leadRecord.id,
      authorId: ownerId,
      content: lead.note,
    },
  });

  for (const generation of lead.generations) {
    await prisma.aIGeneration.upsert({
      where: {
        id: `${leadRecord.id}-${generation.key}`,
      },
      update: {
        type: generation.type,
        model: generation.model,
        promptVersion: generation.promptVersion,
        inputSummary: generation.inputSummary,
        outputText: generation.outputText,
      },
      create: {
        id: `${leadRecord.id}-${generation.key}`,
        tenantId,
        leadId: leadRecord.id,
        conversationId: conversation.id,
        requestedById: ownerId,
        type: generation.type,
        model: generation.model,
        promptVersion: generation.promptVersion,
        inputSummary: generation.inputSummary,
        outputText: generation.outputText,
      },
    });
  }

  await prisma.leadTag.deleteMany({
    where: {
      leadId: leadRecord.id,
    },
  });

  for (const tagName of lead.tags) {
    const tag = tagsByName.get(tagName);

    if (!tag) {
      continue;
    }

    await prisma.leadTag.create({
      data: {
        leadId: leadRecord.id,
        tagId: tag.id,
        assignedBy: ownerId,
      },
    });
  }
}

async function main() {
  const ownerPasswordHash = await hash(process.env.DEMO_USER_PASSWORD ?? "demo12345", 12);

  const northstar = await prisma.tenant.upsert({
    where: { slug: "northstar-studio" },
    update: {},
    create: {
      slug: "northstar-studio",
      name: "Northstar Studio",
    },
  });

  const signalLab = await prisma.tenant.upsert({
    where: { slug: "signal-lab" },
    update: {},
    create: {
      slug: "signal-lab",
      name: "Signal Lab",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@northstarstudio.test" },
    update: {
      name: "Chiemelie Ekezie",
      passwordHash: ownerPasswordHash,
    },
    create: {
      email: "owner@northstarstudio.test",
      name: "Chiemelie Ekezie",
      passwordHash: ownerPasswordHash,
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: northstar.id,
        userId: owner.id,
      },
    },
    update: {
      role: MembershipRole.OWNER,
    },
    create: {
      tenantId: northstar.id,
      userId: owner.id,
      role: MembershipRole.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: {
      tenantId_userId: {
        tenantId: signalLab.id,
        userId: owner.id,
      },
    },
    update: {
      role: MembershipRole.ADMIN,
    },
    create: {
      tenantId: signalLab.id,
      userId: owner.id,
      role: MembershipRole.ADMIN,
    },
  });

  const northstarTags = await Promise.all(
    [
      { name: "high intent", color: "amber" },
      { name: "branding", color: "orange" },
      { name: "timeline urgent", color: "rose" },
      { name: "budget confirmed", color: "emerald" },
      { name: "healthcare", color: "sky" },
      { name: "follow-up", color: "violet" },
      { name: "referral", color: "cyan" },
      { name: "retainer", color: "indigo" },
      { name: "operations", color: "lime" },
      { name: "webhook demo", color: "pink" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: {
          tenantId_name: {
            tenantId: northstar.id,
            name: tag.name,
          },
        },
        update: { color: tag.color },
        create: {
          tenantId: northstar.id,
          name: tag.name,
          color: tag.color,
        },
      }),
    ),
  );

  const signalTags = await Promise.all(
    [
      { name: "product strategy", color: "sky" },
      { name: "pilot expansion", color: "emerald" },
      { name: "founder-led", color: "amber" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: {
          tenantId_name: {
            tenantId: signalLab.id,
            name: tag.name,
          },
        },
        update: { color: tag.color },
        create: {
          tenantId: signalLab.id,
          name: tag.name,
          color: tag.color,
        },
      }),
    ),
  );

  const northstarTagMap = new Map(northstarTags.map((tag) => [tag.name, { id: tag.id }]));
  const signalTagMap = new Map(signalTags.map((tag) => [tag.name, { id: tag.id }]));

  const northstarLeads: SeedLead[] = [
    {
      key: "studio-lantern",
      email: "maya@studiolantern.test",
      name: "Maya Cole",
      company: "Studio Lantern",
      phone: "+1 (415) 555-0142",
      industry: "Design",
      website: "https://studiolantern.test",
      companyNotes:
        "Founder-led studio with a launch deadline before June and a preference for concise collaboration.",
      title: "Brand refresh and marketing site",
      source: LeadSource.FORM,
      priority: LeadPriority.HIGH,
      stage: LeadStage.QUALIFIED,
      summary:
        "High-intent design lead asking for a fast turnaround with unclear budget but clear launch timing.",
      nextAction: "Send a short discovery recap and clarify budget range.",
      followUpAt: new Date("2026-05-06T10:00:00.000Z"),
      lastContactAt: new Date("2026-05-05T14:20:00.000Z"),
      channel: "web-form",
      subject: "Brand refresh inquiry",
      tags: ["high intent", "branding", "timeline urgent"],
      note: "Good fit for strategy plus implementation. Ask budget before giving a fixed site scope.",
      messages: [
        {
          key: "message-1",
          direction: MessageDirection.INBOUND,
          subject: "Brand refresh inquiry",
          source: "website_form",
          content: "Looking for a brand refresh and a four-page marketing site before June.",
        },
        {
          key: "message-2",
          direction: MessageDirection.OUTBOUND,
          subject: "Re: Brand refresh inquiry",
          source: "manual_reply",
          content: "Happy to help. I can outline a discovery phase and timeline this afternoon.",
        },
      ],
      generations: [
        {
          key: "tagging",
          type: AIGenerationType.TAGGING,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "Brand refresh and fast timeline inquiry.",
          outputText: "Tagged as high intent, branding, timeline urgent. Budget still unknown.",
        },
        {
          key: "summary",
          type: AIGenerationType.SUMMARY,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "Brand refresh inquiry with launch urgency.",
          outputText: "Founder-led design inquiry with strong urgency and a likely need for a concise discovery-first proposal.",
        },
      ],
    },
    {
      key: "signal-health",
      email: "david@signalhealth.test",
      name: "David Owusu",
      company: "Signal Health",
      phone: "+233 20 555 1904",
      industry: "Healthcare",
      website: "https://signalhealth.test",
      companyNotes:
        "Healthcare startup evaluating a site rebuild with compliance review and a fixed-price procurement preference.",
      title: "Healthcare site rebuild estimate",
      source: LeadSource.REFERRAL,
      priority: LeadPriority.URGENT,
      stage: LeadStage.PROPOSAL,
      summary:
        "Warm referral for a healthcare site rebuild with budget signals and decision-maker access already confirmed.",
      nextAction: "Prepare phased estimate and confirm content ownership.",
      followUpAt: new Date("2026-05-06T09:00:00.000Z"),
      lastContactAt: new Date("2026-05-05T12:30:00.000Z"),
      channel: "email",
      subject: "Healthcare rebuild estimate",
      tags: ["referral", "budget confirmed", "healthcare"],
      note: "Decision-maker is engaged. Proposal should stay concise and show delivery phases clearly.",
      messages: [
        {
          key: "message-1",
          direction: MessageDirection.INBOUND,
          subject: "Healthcare rebuild estimate",
          source: "referral_email",
          content: "Shared scope notes after a discovery call and wants a fixed-price estimate.",
        },
        {
          key: "message-2",
          direction: MessageDirection.OUTBOUND,
          subject: "Re: Healthcare rebuild estimate",
          source: "manual_reply",
          content: "I will send a phased estimate with compliance assumptions and ownership notes.",
        },
      ],
      generations: [
        {
          key: "tagging",
          type: AIGenerationType.TAGGING,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "Healthcare rebuild estimate request.",
          outputText: "Suggested a structured estimate reply with phased delivery and discovery recap.",
        },
      ],
    },
    {
      key: "park-copy",
      email: "nina@parkcopyco.test",
      name: "Nina Park",
      company: "Park Copy Co.",
      phone: "+1 (917) 555-0118",
      industry: "Copywriting",
      website: "https://parkcopyco.test",
      companyNotes:
        "Small copy studio exploring a recurring retainer. Responds better to simple package comparisons than long proposals.",
      title: "Copy support retainer",
      source: LeadSource.EMAIL,
      priority: LeadPriority.MEDIUM,
      stage: LeadStage.FOLLOW_UP,
      summary:
        "Earlier strong interest, now stalled. Best next move is a concise follow-up with package options.",
      nextAction: "Follow up with two retainer options and a clearer monthly scope.",
      followUpAt: new Date("2026-05-07T14:00:00.000Z"),
      lastContactAt: new Date("2026-05-03T11:15:00.000Z"),
      channel: "email",
      subject: "Copy support retainer",
      tags: ["follow-up", "retainer"],
      note: "Feels warm but stalled. Lower decision effort and compare two simple plans.",
      messages: [
        {
          key: "message-1",
          direction: MessageDirection.INBOUND,
          subject: "Copy support retainer",
          source: "gmail_sync",
          content: "Went quiet after asking whether ongoing content support is included.",
        },
      ],
      generations: [
        {
          key: "follow-up",
          type: AIGenerationType.FOLLOW_UP,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "Retainer lead stalled after scope question.",
          outputText: "Recommended a concise follow-up with package options and a clearer retainer scope.",
        },
      ],
    },
    {
      key: "northwell-ops",
      email: "rachel@northwellops.test",
      name: "Rachel Mendez",
      company: "Northwell Ops",
      phone: "+1 (646) 555-0184",
      industry: "Operations consulting",
      website: "https://northwellops.test",
      companyNotes:
        "Operator-led consultancy evaluating a repeatable CRM setup after outgrowing spreadsheets and shared email.",
      title: "CRM workflow setup and intake cleanup",
      source: LeadSource.FORM,
      priority: LeadPriority.HIGH,
      stage: LeadStage.NEW,
      summary:
        "Operations-focused inquiry asking for a workflow cleanup, form intake design, and simple automations.",
      nextAction: "Book a discovery call and ask for current intake examples.",
      followUpAt: new Date("2026-05-05T16:00:00.000Z"),
      lastContactAt: new Date("2026-05-05T09:05:00.000Z"),
      channel: "web-form",
      subject: "CRM workflow setup",
      tags: ["operations", "webhook demo", "high intent"],
      note: "Strong portfolio-fit lead because they specifically care about intake, follow-up rules, and searchable history.",
      messages: [
        {
          key: "message-1",
          direction: MessageDirection.INBOUND,
          subject: "CRM workflow setup",
          source: "website_form",
          content: "We need a cleaner CRM workflow, form intake, and follow-up reminders without enterprise software overhead.",
        },
      ],
      generations: [
        {
          key: "reply",
          type: AIGenerationType.REPLY_SUGGESTION,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "CRM workflow setup inquiry from operator-led consultancy.",
          outputText: "Acknowledge the spreadsheet pain, ask for their current pipeline stages, and propose a short workflow audit call.",
        },
      ],
    },
    {
      key: "atlas-kitchen",
      email: "leo@atlaskitchen.test",
      name: "Leo Barrett",
      company: "Atlas Kitchen",
      phone: "+1 (512) 555-0107",
      industry: "Hospitality",
      website: "https://atlaskitchen.test",
      companyNotes:
        "Hospitality brand with strong visuals but no urgency. Good example of a lead that should be marked lost instead of chased forever.",
      title: "Seasonal campaign landing page",
      source: LeadSource.IMPORT,
      priority: LeadPriority.LOW,
      stage: LeadStage.LOST,
      summary:
        "Imported historical lead that went cold after multiple timing changes and no approved budget.",
      nextAction: "Leave archived unless they reopen the conversation with approved timing and budget.",
      followUpAt: null,
      lastContactAt: new Date("2026-04-20T17:40:00.000Z"),
      channel: "import",
      subject: "Seasonal campaign landing page",
      tags: ["branding"],
      note: "Useful for screenshots because it shows the lost stage and prevents the demo from looking unrealistically optimistic.",
      messages: [
        {
          key: "message-1",
          direction: MessageDirection.INBOUND,
          subject: "Seasonal campaign landing page",
          source: "csv_import",
          content: "The campaign might move to next quarter, so we are pausing all external work for now.",
        },
      ],
      generations: [
        {
          key: "summary",
          type: AIGenerationType.SUMMARY,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "Imported paused campaign lead.",
          outputText: "Low-priority historical opportunity with no near-term follow-up signal.",
        },
      ],
    },
  ];

  const signalLabLeads: SeedLead[] = [
    {
      key: "pilot-expansion",
      email: "amira@pilotgrid.test",
      name: "Amira Hassan",
      company: "Pilot Grid",
      phone: "+44 20 5555 0181",
      industry: "B2B SaaS",
      website: "https://pilotgrid.test",
      companyNotes:
        "Founder-led analytics SaaS exploring a launch support engagement for an expansion into a new buyer segment.",
      title: "Product messaging sprint",
      source: LeadSource.REFERRAL,
      priority: LeadPriority.HIGH,
      stage: LeadStage.QUALIFIED,
      summary:
        "Cross-workspace lead that proves the same user can work in another tenant with different contacts and memory.",
      nextAction: "Prepare a lightweight strategy sprint outline.",
      followUpAt: new Date("2026-05-06T11:00:00.000Z"),
      lastContactAt: new Date("2026-05-05T13:00:00.000Z"),
      channel: "email",
      subject: "Product messaging sprint",
      tags: ["product strategy", "pilot expansion", "founder-led"],
      note: "Useful for demonstrating workspace switching with distinct data instead of mirrored demo leads.",
      messages: [
        {
          key: "message-1",
          direction: MessageDirection.INBOUND,
          subject: "Product messaging sprint",
          source: "referral_email",
          content: "We need sharper product messaging before rolling out to a new operations audience next quarter.",
        },
      ],
      generations: [
        {
          key: "tagging",
          type: AIGenerationType.TAGGING,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "Product messaging sprint inquiry.",
          outputText: "Tagged as founder-led, product strategy, and pilot expansion.",
        },
      ],
    },
    {
      key: "founder-ops-retainer",
      email: "ben@harborscope.test",
      name: "Ben Carter",
      company: "HarborScope",
      phone: "+1 (206) 555-0176",
      industry: "Advisory",
      website: "https://harborscope.test",
      companyNotes:
        "Small advisory shop considering a standing retainer for product positioning and launch support.",
      title: "Founder advisory retainer",
      source: LeadSource.EMAIL,
      priority: LeadPriority.MEDIUM,
      stage: LeadStage.WON,
      summary:
        "Won lead in the second workspace so the switcher shows different pipeline health and not just duplicated open work.",
      nextAction: "Kick off onboarding and define a monthly communication cadence.",
      followUpAt: new Date("2026-05-08T15:30:00.000Z"),
      lastContactAt: new Date("2026-05-04T18:10:00.000Z"),
      channel: "email",
      subject: "Founder advisory retainer",
      tags: ["founder-led", "product strategy"],
      note: "Good anchor for the won view in a non-primary workspace.",
      messages: [
        {
          key: "message-1",
          direction: MessageDirection.INBOUND,
          subject: "Founder advisory retainer",
          source: "gmail_sync",
          content: "The monthly retainer structure works for us. Send over the next steps and kickoff timing.",
        },
      ],
      generations: [
        {
          key: "summary",
          type: AIGenerationType.SUMMARY,
          model: "gpt-5.4-mini",
          promptVersion: "v1",
          inputSummary: "Won founder advisory retainer.",
          outputText: "Closed retainer with clear onboarding momentum and a straightforward monthly scope.",
        },
      ],
    },
  ];

  for (const lead of northstarLeads) {
    await seedWorkspaceLead({
      tenantId: northstar.id,
      ownerId: owner.id,
      tagsByName: northstarTagMap,
      lead,
    });
  }

  for (const lead of signalLabLeads) {
    await seedWorkspaceLead({
      tenantId: signalLab.id,
      ownerId: owner.id,
      tagsByName: signalTagMap,
      lead,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
