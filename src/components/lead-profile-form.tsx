import { FormSubmitButton } from "@/components/form-submit-button";
import { updateLeadProfileAction } from "@/lib/lead-actions";

type LeadProfileFormProps = {
  workspaceSlug: string;
  leadId: string;
  mode: "database" | "demo";
  title: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  industry: string;
  website: string;
  companyNotes: string;
};

export function LeadProfileForm({
  workspaceSlug,
  leadId,
  mode,
  title,
  name,
  email,
  company,
  phone,
  industry,
  website,
  companyNotes,
}: LeadProfileFormProps) {
  return (
    <form action={updateLeadProfileAction} className="grid min-w-0 gap-1">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />

      <p className="text-sm font-medium text-slate-950">Lead profile</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Keep the opportunity title and contact profile accurate so workflow, AI
        context, and search all stay grounded in real client details.
      </p>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Opportunity title</span>
          <input
            name="title"
            defaultValue={title}
            required
            className="crm-input"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Contact name</span>
            <input
              name="name"
              defaultValue={name}
              required
              className="crm-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              className="crm-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Company</span>
            <input
              name="company"
              defaultValue={company}
              className="crm-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Phone</span>
            <input
              name="phone"
              defaultValue={phone === "No phone saved" ? "" : phone}
              className="crm-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Industry</span>
            <input
              name="industry"
              defaultValue={industry === "No industry saved" ? "" : industry}
              className="crm-input"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Website</span>
            <input
              name="website"
              type="url"
              defaultValue={website === "No website saved" ? "" : website}
              className="crm-input"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Company notes</span>
          <textarea
            name="companyNotes"
            rows={3}
            defaultValue={
              companyNotes === "No company notes saved yet." ? "" : companyNotes
            }
            className="crm-input"
            placeholder="Capture context about budget, procurement, team structure, or how this company prefers to work."
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database"
            ? "Updates the lead title and contact profile"
            : "Demo mode redirect only"}
        </span>
        <FormSubmitButton
          idleLabel="Save profile"
          pendingLabel="Saving profile..."
          className="crm-button"
        />
      </div>
    </form>
  );
}
