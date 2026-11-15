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
  messages: TimelineMessage[];
  notes: TimelineNote[];
  aiOutputs: TimelineAIOutput[];
};

type TimelineEvent = {
  id: string;
  kind: "message" | "note" | "ai";
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
  messages,
  notes,
  aiOutputs,
}: LeadActivityTimelineProps) {
  const events: TimelineEvent[] = [
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
      meta: message.direction === "INBOUND" ? "Client" : "Conversation",
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
  ].sort((a, b) => b.createdAtValue - a.createdAtValue);
  return (
    <section className="crm-panel">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Conversation & activity</h2>
        <span className="text-xs text-slate-500">{events.length} entries</span>
      </div>
      <div className="mt-5 grid gap-4">
        {events.length ? (
          events.map((event) => (
            <article
              key={event.id}
              id={event.id}
              className={`scroll-mt-5 rounded-lg border p-4 ${event.kind === "note" ? "border-amber-100 bg-amber-50/50" : event.kind === "ai" ? "border-teal-100 bg-teal-50/30" : "border-slate-200 bg-white"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-slate-700">
                  {event.title}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {event.createdAt}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                {event.body}
              </p>
              <p className="mt-3 text-[11px] text-slate-500">{event.meta}</p>
            </article>
          ))
        ) : (
          <p className="py-5 text-sm text-slate-500">
            No conversation yet. Add a note or record a reply to start the
            history.
          </p>
        )}
      </div>
    </section>
  );
}
