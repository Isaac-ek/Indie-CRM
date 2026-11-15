import { addLeadNoteAction } from "@/lib/lead-actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type LeadNoteFormProps = {
  workspaceSlug: string;
  leadId: string;
  mode: "database" | "demo";
};

export function LeadNoteForm({
  workspaceSlug,
  leadId,
  mode,
}: LeadNoteFormProps) {
  return (
    <form action={addLeadNoteAction} className="grid min-w-0 gap-1">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />
      <label className="grid gap-2 text-sm text-slate-700">
        <span className="font-medium">Add internal note</span>
        <textarea
          name="content"
          required
          rows={3}
          className="crm-input"
          placeholder="Capture context, objections, or the next move..."
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database"
            ? "Saves to workspace notes"
            : "Demo mode preview only"}
        </span>
        <FormSubmitButton
          idleLabel="Save note"
          pendingLabel="Saving note..."
          className="crm-button"
        />
      </div>
    </form>
  );
}
