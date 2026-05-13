type TimelineMessage = {
  id: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  content: string;
  createdAt: string;
  createdAtValue: string;
};

type TimelineNote = {
  id: string;
  content: string;
  createdAt: string;
  createdAtValue: string;
  author: string;
};

type TimelineAIOutput = {
  id: string;
  label: string;
  body: string;
  createdAt: string;
  createdAtValue: string;
};

type LeadActivityTimelineProps = {
  leadName: string;
  stage: string;
  followUp: string;
  nextAction: string;
  messages: TimelineMessage[];
  notes: TimelineNote[];
  aiOutputs: TimelineAIOutput[];
};

type TimelineEvent = {
  id: string;
  kind: "message" | "note" | "ai" | "system";
  title: string;
  body: string;
  meta: string;
  createdAt: string;
  createdAtValue: number;
};

function parseSortableDate(value: string, fallbackRank: number) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallbackRank : parsed;
}

export function LeadActivityTimeline({
  leadName,
  stage,
  followUp,
  nextAction,
  messages,
  notes,
  aiOutputs,
}: LeadActivityTimelineProps) {
  const systemEvents: TimelineEvent[] = [
    {
      id: "system-current-workflow",
      kind: "system",
      title: "Current workflow snapshot",
      body: `Stage: ${stage}. Follow-up: ${followUp}. Next action: ${nextAction}`,
      meta: `${leadName} overview`,
      createdAt: "Now",
      createdAtValue: Number.MAX_SAFE_INTEGER,
    },
  ];

  const events = [
    ...messages.map((message, index) => ({
      id: `message-${message.id}`,
      kind: "message" as const,
      title:
        message.direction === "INBOUND"
          ? "Inbound message"
          : message.direction === "OUTBOUND"
            ? "Outbound reply"
            : "Internal message",
      body: message.content,
      meta: message.direction.toLowerCase(),
      createdAt: message.createdAt,
      createdAtValue: parseSortableDate(message.createdAtValue, 1000 + index),
    })),
    ...notes.map((note, index) => ({
      id: `note-${note.id}`,
      kind: "note" as const,
      title: "Internal note",
      body: note.content,
      meta: note.author,
      createdAt: note.createdAt,
      createdAtValue: parseSortableDate(note.createdAtValue, 2000 + index),
    })),
    ...aiOutputs.map((output, index) => ({
      id: `ai-${output.id}`,
      kind: "ai" as const,
      title: output.label,
      body: output.body,
      meta: "AI generation",
      createdAt: output.createdAt,
      createdAtValue: parseSortableDate(output.createdAtValue, 3000 + index),
    })),
    ...systemEvents,
  ].sort((a, b) => b.createdAtValue - a.createdAtValue);

  if (events.length === 1) {
    return (
      <section className="rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] p-5 shadow-[0_24px_80px_rgba(148,163,184,0.16)]">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Activity timeline</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Everything that happened on this lead</h3>
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-600">
          This lead has workflow context, but no messages, notes, or AI runs yet. Send a reply, save a note, or generate a draft to start building real client memory.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] p-5 shadow-[0_24px_80px_rgba(148,163,184,0.16)]">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Activity timeline</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">Everything that happened on this lead</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Messages, notes, and AI runs are merged into one stream so the lead record reads like an actual operating history instead of scattered panels.
      </p>

      <div className="mt-6 space-y-4">
        {events.map((event) => (
          <article
            key={event.id}
            id={event.id}
            className={`rounded-[1.4rem] border px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)] ${
              event.kind === "message"
                ? "border-sky-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,246,255,0.94))]"
                : event.kind === "note"
                  ? "border-amber-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,247,237,0.94))]"
                  : event.kind === "ai"
                    ? "border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(236,253,245,0.94))]"
                    : "border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(243,244,246,0.94))]"
            } scroll-mt-28`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {event.meta}
                  </span>
                  <h4 className="text-base font-semibold text-slate-950">{event.title}</h4>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{event.body}</p>
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{event.createdAt}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
