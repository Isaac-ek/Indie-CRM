import { addLeadNoteAction } from "@/lib/lead-actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type LeadNoteFormProps = {
  workspaceSlug: string;
  leadId: string;
  mode: "database" | "demo";
};

export function LeadNoteForm({ workspaceSlug, leadId, mode }: LeadNoteFormProps) {
  return (
    <form
      action={addLeadNoteAction}
      className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,237,0.92))] p-4 shadow-[0_18px_55px_rgba(148,163,184,0.14)]"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />
      <label className="grid gap-2 text-sm text-slate-700">
        <span className="font-medium">Add internal note</span>
        <textarea
          name="content"
          required
          rows={4}
          className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-amber-500 focus:bg-amber-50/40"
          placeholder="Capture context, objections, or the next move..."
        />
      </label>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database" ? "Saves to workspace notes" : "Demo mode preview only"}
        </span>
        <FormSubmitButton
          idleLabel="Save note"
          pendingLabel="Saving note..."
          className="rounded-full bg-[linear-gradient(135deg,#f59e0b,#b45309)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(245,158,11,0.26)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(245,158,11,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
