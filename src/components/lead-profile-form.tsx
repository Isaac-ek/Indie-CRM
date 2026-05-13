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
    <form
      action={updateLeadProfileAction}
      className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92))] p-4 shadow-[0_18px_55px_rgba(148,163,184,0.14)]"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />

      <p className="text-sm font-medium text-slate-950">Lead profile</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Keep the opportunity title and contact profile accurate so workflow, AI context, and search all stay grounded in real client details.
      </p>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Opportunity title</span>
          <input
            name="title"
            defaultValue={title}
            required
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Contact name</span>
            <input
              name="name"
              defaultValue={name}
              required
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Email</span>
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Company</span>
            <input
              name="company"
              defaultValue={company}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Phone</span>
            <input
              name="phone"
              defaultValue={phone === "No phone saved" ? "" : phone}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Industry</span>
            <input
              name="industry"
              defaultValue={industry === "No industry saved" ? "" : industry}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Website</span>
            <input
              name="website"
              type="url"
              defaultValue={website === "No website saved" ? "" : website}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Company notes</span>
          <textarea
            name="companyNotes"
            rows={4}
            defaultValue={companyNotes === "No company notes saved yet." ? "" : companyNotes}
            className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Capture context about budget, procurement, team structure, or how this company prefers to work."
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database" ? "Updates the lead title and contact profile" : "Demo mode redirect only"}
        </span>
        <FormSubmitButton
          idleLabel="Save profile"
          pendingLabel="Saving profile..."
          className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
