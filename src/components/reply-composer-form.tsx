import { sendLeadReplyAction } from "@/lib/lead-actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type ReplyComposerFormProps = {
  workspaceSlug: string;
  leadId: string;
  mode: "database" | "demo";
};

export function ReplyComposerForm({
  workspaceSlug,
  leadId,
  mode,
}: ReplyComposerFormProps) {
  return (
    <form
      action={sendLeadReplyAction}
      className="rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(239,248,255,0.9))] p-5 shadow-[0_18px_55px_rgba(148,163,184,0.16)]"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-teal-700">Reply composer</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Send the next response</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This writes an outbound message into the conversation timeline so the lead record
            reflects actual relationship history instead of just notes.
          </p>
        </div>
        <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
          {mode === "database" ? "Persists outbound messages" : "Demo mode redirect only"}
        </div>
      </div>

      <label className="mt-6 grid gap-2 text-sm text-slate-700">
        <span className="font-medium">Reply message</span>
        <textarea
          name="content"
          required
          rows={6}
          className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
          placeholder="Hi Maya, thanks for the context. I can put together a discovery recap and timeline..."
        />
      </label>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          Saves to the current lead conversation and refreshes the timeline.
        </span>
        <FormSubmitButton
          idleLabel="Save outbound reply"
          pendingLabel="Saving reply..."
          className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
