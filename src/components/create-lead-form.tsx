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
      <h2 className="text-base font-semibold">New lead</h2>
      <p className="mt-1 text-xs text-slate-500">
        Start with the contact and what they need.
        {mode === "demo" ? " Preview only; this will not save." : ""}
      </p>

      <form
        action={createLeadAction}
        className="mt-6 grid gap-4 lg:grid-cols-2"
      >
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
