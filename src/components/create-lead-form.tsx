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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
            Intake Form
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">
            Create & Capture New Lead
          </h3>
          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600">
            Add a new lead directly into this workspace with automatic tenant scoping and AI tagging.
          </p>
        </div>
        <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-900">
          {mode === "database" ? "Database Persistence" : "Demo Mode"}
        </span>
      </div>

      <form action={createLeadAction} className="mt-6 grid gap-4 lg:grid-cols-2">
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />

        <label className="grid gap-1.5 text-sm text-slate-900">
          <span className="font-bold">Lead Name</span>
          <input
            name="name"
            type="text"
            required
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            placeholder="e.g. Maya Cole"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-slate-900">
          <span className="font-bold">Email Address</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            placeholder="e.g. maya@studiolantern.com"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-slate-900">
          <span className="font-bold">Company</span>
          <input
            name="company"
            type="text"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            placeholder="e.g. Studio Lantern"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-slate-900">
          <span className="font-bold">Opportunity Title</span>
          <input
            name="title"
            type="text"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            placeholder="e.g. Brand refresh and marketing site"
          />
        </label>

        <label className="grid gap-1.5 text-sm text-slate-900">
          <span className="font-bold">Source</span>
          <select
            name="source"
            defaultValue="MANUAL"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm text-slate-900">
          <span className="font-bold">Priority</span>
          <select
            name="priority"
            defaultValue="MEDIUM"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm text-slate-900 lg:col-span-2">
          <span className="font-bold">Initial Inquiry / Context</span>
          <textarea
            name="inquiry"
            rows={4}
            required
            className="rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
            placeholder="Describe the initial inquiry details, requirements, budget, or timeline..."
          />
        </label>

        <div className="flex items-center justify-end lg:col-span-2 mt-2">
          <FormSubmitButton
            idleLabel="Create Lead"
            pendingLabel="Saving Lead..."
            className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-500 transition"
          />
        </div>
      </form>
    </section>
  );
}
