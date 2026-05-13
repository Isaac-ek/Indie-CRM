import { createLeadAction } from "@/lib/lead-actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type CreateLeadFormProps = {
  workspaceSlug: string;
  mode: "database" | "demo";
};

export function CreateLeadForm({ workspaceSlug, mode }: CreateLeadFormProps) {
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

  return (
    <section className="rounded-[1.9rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(238,247,255,0.92))] p-6 shadow-[0_24px_80px_rgba(148,163,184,0.16)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-teal-700">
            New Lead
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Capture a real inquiry
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This is the first auth-ready write path. Once workspace identity is backed by
            login, this action already knows which tenant to write into.
          </p>
        </div>
        <div className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
          {mode === "database" ? "Writes to database" : "Demo mode redirect only"}
        </div>
      </div>

      <form action={createLeadAction} className="mt-6 grid gap-4 lg:grid-cols-2">
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Lead name</span>
          <input
            name="name"
            type="text"
            required
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Maya Cole"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="maya@company.com"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Company</span>
          <input
            name="company"
            type="text"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Studio Lantern"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Opportunity or category</span>
          <input
            name="title"
            type="text"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Personal, website redesign, discovery call, support retainer..."
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Source</span>
          <select
            name="source"
            defaultValue="MANUAL"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-teal-500 focus:bg-teal-50/40"
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
            defaultValue="MEDIUM"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-teal-500 focus:bg-teal-50/40"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-[1.5rem] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(254,243,199,0.85),rgba(255,255,255,0.85))] px-4 py-4 text-sm leading-6 text-amber-950">
          {mode === "database"
            ? "When submitted, this will create a contact, lead, conversation, and initial inbound message inside the selected workspace with workflow metadata from day one."
            : "Connect DATABASE_URL later and this same form will start persisting leads without changing the UI."}
        </div>

        <label className="grid gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-medium">Inquiry</span>
          <textarea
            name="inquiry"
            required
            rows={5}
            className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 outline-none ring-0 transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Looking for a brand refresh and marketing site before June..."
          />
        </label>

        <div className="lg:col-span-2">
          <FormSubmitButton
            idleLabel="Create lead"
            pendingLabel="Creating lead..."
            className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
      </form>
    </section>
  );
}
