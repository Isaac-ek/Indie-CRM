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
    <form action={updateLeadWorkflowAction} className="grid min-w-0 gap-1">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />

      <div className="grid gap-3">
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Stage</span>
          <select name="stage" defaultValue={stage} className="crm-input">
            {stageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Priority</span>
          <select
            name="priority"
            defaultValue={priorityValue}
            className="crm-input"
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
            className="crm-input"
          />
        </label>
        <details>
          <summary className="cursor-pointer text-xs text-slate-500">
            Lead source
          </summary>
          <div className="mt-3">
            {" "}
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Source</span>
              <select
                name="source"
                defaultValue={sourceValue}
                className="crm-input"
              >
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database"
            ? "Changes save to this lead"
            : "Demo mode redirect only"}
        </span>
        <FormSubmitButton
          idleLabel="Save workflow"
          pendingLabel="Saving workflow..."
          className="crm-button"
        />
      </div>
    </form>
  );
}
