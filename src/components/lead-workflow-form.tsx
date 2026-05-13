import { updateLeadWorkflowAction } from "@/lib/lead-actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type LeadWorkflowFormProps = {
  workspaceSlug: string;
  leadId: string;
  mode: "database" | "demo";
  stage: "New" | "Qualified" | "Proposal" | "Follow-up" | "Won" | "Lost";
  sourceValue: "MANUAL" | "FORM" | "EMAIL" | "REFERRAL" | "IMPORT";
  priorityValue: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  followUpDateValue: string;
};

const stageOptions: LeadWorkflowFormProps["stage"][] = [
  "New",
  "Qualified",
  "Proposal",
  "Follow-up",
  "Won",
  "Lost",
];

const sourceOptions = [
  { value: "MANUAL", label: "Manual" },
  { value: "FORM", label: "Form" },
  { value: "EMAIL", label: "Email" },
  { value: "REFERRAL", label: "Referral" },
  { value: "IMPORT", label: "Import" },
] as const;

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export function LeadWorkflowForm({
  workspaceSlug,
  leadId,
  mode,
  stage,
  sourceValue,
  priorityValue,
  followUpDateValue,
}: LeadWorkflowFormProps) {
  return (
    <form
      action={updateLeadWorkflowAction}
      className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,249,255,0.92))] p-4 shadow-[0_18px_55px_rgba(148,163,184,0.14)]"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />

      <p className="text-sm font-medium text-slate-950">Lead workflow</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Update the current stage and follow-up date so the dashboard reflects the real next move.
      </p>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Stage</span>
          <select
            name="stage"
            defaultValue={stage}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:bg-sky-50/40"
          >
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Source</span>
          <select
            name="source"
            defaultValue={sourceValue}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:bg-sky-50/40"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Priority</span>
          <select
            name="priority"
            defaultValue={priorityValue}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:bg-sky-50/40"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Follow-up date</span>
          <input
            name="followUpDate"
            type="date"
            defaultValue={followUpDateValue}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-500 focus:bg-sky-50/40"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database" ? "Updates the lead record and dashboard queue" : "Demo mode redirect only"}
        </span>
        <FormSubmitButton
          idleLabel="Save workflow"
          pendingLabel="Saving workflow..."
          className="rounded-full bg-[linear-gradient(135deg,#0284c7,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(2,132,199,0.26)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(2,132,199,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
