export type LeadStage = "New" | "Qualified" | "Proposal" | "Follow-up";

export type Lead = {
  id: string;
  name: string;
  company: string;
  title: string;
  stage: LeadStage;
  source: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  lastMessage: string;
  summary: string;
  nextAction: string;
  followUp: string;
  tags: string[];
};

export type LeadDetail = Lead & {
  email: string;
  phone: string;
  industry: string;
  website: string;
  companyNotes: string;
  title: string;
  nextAction: string;
  notes: { id: string; content: string; createdAt: string; author: string }[];
  messages: {
    id: string;
    direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
    content: string;
    createdAt: string;
  }[];
  aiOutputs: { id: string; label: string; body: string }[];
};

export const leads: Lead[] = [
  {
    id: "lead_1",
    name: "Maya Cole",
    company: "Studio Lantern",
    title: "Brand refresh and marketing site",
    stage: "Qualified",
    source: "Website form",
    priority: "High",
    lastMessage: "Looking for a brand refresh and a four-page marketing site before June.",
    summary:
      "High-intent design lead asking for a fast turnaround with unclear budget but clear launch timing.",
    nextAction: "Send a short discovery recap and clarify budget range.",
    followUp: "Today",
    tags: ["high intent", "branding", "timeline urgent"],
  },
  {
    id: "lead_2",
    name: "David Owusu",
    company: "Signal Health",
    title: "Healthcare site rebuild estimate",
    stage: "Proposal",
    source: "Referral",
    priority: "Urgent",
    lastMessage: "Shared scope notes after a discovery call and wants a fixed-price estimate.",
    summary:
      "Warm referral for a healthcare site rebuild with budget signals and decision-maker access already confirmed.",
    nextAction: "Prepare phased estimate and confirm content ownership.",
    followUp: "Tomorrow",
    tags: ["referral", "budget confirmed", "healthcare"],
  },
  {
    id: "lead_3",
    name: "Nina Park",
    company: "Park Copy Co.",
    title: "Copy support retainer",
    stage: "Follow-up",
    source: "Email",
    priority: "Medium",
    lastMessage: "Went quiet after asking whether ongoing content support is included.",
    summary:
      "Earlier strong interest, now stalled. Best next move is a concise follow-up with package options.",
    nextAction: "Follow up with two retainer options and a clearer monthly scope.",
    followUp: "Apr 14",
    tags: ["follow-up", "copywriting", "retainer"],
  },
];

export const leadDetails: LeadDetail[] = [
  {
    ...leads[0],
    email: "maya@studiolantern.test",
    phone: "+1 (415) 555-0142",
    industry: "Design",
    website: "https://studiolantern.test",
    companyNotes:
      "Founder-led studio with a launch deadline before June and a clear preference for concise project communication.",
    notes: [
      {
        id: "note_1",
        content: "Strong fit for brand strategy plus a lightweight marketing site retainer.",
        createdAt: "Apr 12",
        author: "Chiemelie Ekezie",
      },
    ],
    messages: [
      {
        id: "message_1",
        direction: "INBOUND",
        content: "Looking for a brand refresh and a four-page marketing site before June.",
        createdAt: "Apr 12",
      },
      {
        id: "message_2",
        direction: "OUTBOUND",
        content: "Happy to help. I can outline a discovery phase and timeline this afternoon.",
        createdAt: "Apr 12",
      },
    ],
    aiOutputs: [
      {
        id: "ai_1",
        label: "Auto-tagging",
        body: "High intent, branding, timeline urgent. Budget not yet confirmed.",
      },
      {
        id: "ai_2",
        label: "Suggested reply",
        body: "Acknowledge the June timeline, ask about budget range, and offer a discovery call.",
      },
    ],
  },
  {
    ...leads[1],
    email: "david@signalhealth.test",
    phone: "+233 20 555 1904",
    industry: "Healthcare",
    website: "https://signalhealth.test",
    companyNotes:
      "Healthcare startup evaluating a site rebuild with compliance constraints and a fixed-price procurement preference.",
    notes: [
      {
        id: "note_2",
        content: "Referral lead with real urgency and clearer budget than most inbound leads.",
        createdAt: "Apr 12",
        author: "Chiemelie Ekezie",
      },
    ],
    messages: [
      {
        id: "message_3",
        direction: "INBOUND",
        content: "Shared scope notes after a discovery call and wants a fixed-price estimate.",
        createdAt: "Apr 12",
      },
    ],
    aiOutputs: [
      {
        id: "ai_3",
        label: "Summary",
        body: "Decision-maker engaged. Discovery complete. Proposal-ready with healthcare compliance context.",
      },
    ],
  },
  {
    ...leads[2],
    email: "nina@parkcopyco.test",
    phone: "+1 (917) 555-0118",
    industry: "Copywriting",
    website: "https://parkcopyco.test",
    companyNotes:
      "Small copy studio exploring a recurring retainer. Responds better to simple package comparisons than long proposals.",
    notes: [
      {
        id: "note_3",
        content: "Feels warm but stalled. The next message should lower decision effort.",
        createdAt: "Apr 10",
        author: "Chiemelie Ekezie",
      },
    ],
    messages: [
      {
        id: "message_4",
        direction: "INBOUND",
        content: "Went quiet after asking whether ongoing content support is included.",
        createdAt: "Apr 10",
      },
    ],
    aiOutputs: [
      {
        id: "ai_4",
        label: "Follow-up recommendation",
        body: "Offer a concise retainer comparison and re-anchor around outcomes instead of deliverable volume.",
      },
    ],
  },
];

export const metrics = [
  { label: "Active leads", value: "3", detail: "2 in active deal stages" },
  { label: "Hot opportunities", value: "1", detail: "1 high-intent lead right now" },
  { label: "AI generations", value: "3", detail: "Latest tagging and reply activity" },
  { label: "Follow-ups due", value: "3", detail: "All tracked from lead next-step dates" },
];

export const activityFeed = [
  {
    id: "activity_1",
    title: "AI tagged Maya Cole as high intent",
    body: "Budget unknown, branding project, urgent timeline, likely solo-founder fit.",
  },
  {
    id: "activity_2",
    title: "Reply draft prepared for Signal Health",
    body: "Suggested a structured estimate response with phased delivery and discovery recap.",
  },
  {
    id: "activity_3",
    title: "Conversation memory linked to Park Copy Co.",
    body: "Found two similar service-retainer threads from last quarter with successful close outcomes.",
  },
];

export const semanticMatches = [
  {
    query: "Have I worked with a healthcare founder who asked for a fixed estimate?",
    result: "Matched 3 conversations, strongest overlap with Signal Health and Northwell Dental.",
  },
  {
    query: "Which leads mentioned a rushed launch window?",
    result: "Matched 5 threads with delivery urgency tags and under-30-day launch dates.",
  },
];
