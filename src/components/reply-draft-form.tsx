import { generateReplyDraftAction } from "@/lib/lead-actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type ReplyDraftFormProps = {
  workspaceSlug: string;
  leadId: string;
  mode: "database" | "demo";
};

export function ReplyDraftForm({ workspaceSlug, leadId, mode }: ReplyDraftFormProps) {
  return (
    <form
      action={generateReplyDraftAction}
      className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(236,253,245,0.92))] p-4 shadow-[0_18px_55px_rgba(148,163,184,0.14)]"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />
      <p className="text-sm font-medium text-slate-950">Generate reply draft</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Create a stored reply suggestion from the latest lead context so it shows up in the AI workspace panel.
      </p>
      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Tone</span>
          <select
            name="tone"
            defaultValue="Warm and practical"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
          >
            <option>Warm and practical</option>
            <option>Direct and concise</option>
            <option>Confident and consultative</option>
            <option>Friendly and low-pressure</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Extra context</span>
          <textarea
            name="contextNotes"
            rows={3}
            className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Mention budget guardrails, proposal strategy, delivery constraints, or what you want the reply to accomplish."
          />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database" ? "Stores a reply suggestion generation" : "Demo mode redirect only"}
        </span>
        <FormSubmitButton
          idleLabel="Generate draft"
          pendingLabel="Generating..."
          className="rounded-full bg-[linear-gradient(135deg,#14b8a6,#0f766e)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(20,184,166,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(20,184,166,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
