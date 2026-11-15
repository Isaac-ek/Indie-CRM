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
    <form action={sendLeadReplyAction} className="grid min-w-0 gap-1">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="font-medium">Reply message</span>
        <textarea
          name="content"
          required
          rows={4}
          className="crm-input"
          placeholder="Hi Maya, thanks for the context. I can put together a discovery recap and timeline..."
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          Stored in this conversation; email is not sent.
        </span>
        <FormSubmitButton
          idleLabel="Save outbound reply"
          pendingLabel="Saving reply..."
          className="crm-button"
        />
      </div>
    </form>
  );
}
