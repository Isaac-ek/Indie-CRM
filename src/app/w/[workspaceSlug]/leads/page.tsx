import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CreateLeadForm } from "@/components/create-lead-form";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getDashboardData, hasDistinctSummary } from "@/lib/data";
import {
  filterAndSortInboxLeads,
  inboxSortOptions,
  inboxStageOptions,
  inboxViewOptions,
} from "@/lib/lead-inbox";
import {
  bulkUpdateLeadsAction,
  generateReplyDraftAction,
  quickUpdateLeadAction,
} from "@/lib/lead-actions";
import { canManageLeadRecords, getWorkspaceContext } from "@/lib/workspaces";

const stageOptions = inboxStageOptions;
const sortOptions = inboxSortOptions;
const viewOptions = inboxViewOptions;
const quickStageOptions = ["New", "Qualified", "Proposal", "Follow-up", "Won", "Lost"] as const;

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{
    created?: string;
    draftCreated?: string;
    quickUpdated?: string;
    bulkUpdated?: string;
    leadArchived?: string;
    leadDeleted?: string;
    dangerError?: string;
    permissionError?: string;
    q?: string;
    stage?: string;
    tag?: string;
    sort?: string;
    view?: string;
  }>;
};

export default async function LeadsPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const query = await searchParams;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const canEditLeadRecords = canManageLeadRecords(workspace.membershipRole);
  const { leads } = await getDashboardData(workspace.slug);
  const searchText = query.q?.trim().toLowerCase() ?? "";
  const selectedStage =
    stageOptions.find((option) => option === query.stage) ?? "All";
  const selectedSort =
    sortOptions.find((option) => option === query.sort) ?? "follow-up";
  const selectedView =
    viewOptions.find((option) => option === query.view) ?? "all";
  const availableTags = Array.from(new Set(leads.flatMap((lead) => lead.tags))).sort();
  const selectedTag = availableTags.includes(query.tag ?? "") ? query.tag ?? "" : "";
  const filteredLeads = filterAndSortInboxLeads({
    leads,
    searchText,
    selectedStage,
    selectedSort,
    selectedView,
    selectedTag,
  });

  return (
    <AppShell
      currentPath="/leads"
      workspace={workspace}
      eyebrow="Lead Inbox"
      title="Every inquiry in one tenant-safe stream"
      description="This page is the operational inbox for the CRM MVP. It gives us a place to connect manual intake, form ingestion, and later email sync without changing the core lead model."
    >
      <div className="grid min-w-0 gap-6">
        {query.created ? (
          <div className="rounded-[1.5rem] border border-teal-200 bg-[linear-gradient(135deg,rgba(204,251,241,0.9),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-teal-950 shadow-[0_12px_40px_rgba(45,212,191,0.14)]">
            {query.created === "demo"
              ? "Lead creation is wired up, but this workspace is still using demo mode. Add DATABASE_URL and run the Prisma setup commands to persist new leads."
              : "Lead created successfully and added to this workspace."}
          </div>
        ) : null}

        {query.draftCreated ? (
          <div className="rounded-[1.5rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(224,242,254,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-sky-950 shadow-[0_12px_40px_rgba(56,189,248,0.14)]">
            {query.draftCreated === "demo"
              ? "Draft generation is wired up, but this workspace is still in demo mode."
              : "Reply draft generated for this lead."}
          </div>
        ) : null}

        {query.quickUpdated ? (
          <div className="rounded-[1.5rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(254,243,199,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-amber-950 shadow-[0_12px_40px_rgba(251,191,36,0.14)]">
            {query.quickUpdated === "demo"
              ? "Quick lead actions are wired up, but this workspace is still in demo mode."
              : "Lead updated from the inbox."}
          </div>
        ) : null}

        {query.bulkUpdated ? (
          <div className="rounded-[1.5rem] border border-cyan-200 bg-[linear-gradient(135deg,rgba(236,254,255,0.94),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-cyan-950 shadow-[0_12px_40px_rgba(34,211,238,0.12)]">
            {query.bulkUpdated === "demo"
              ? "Bulk lead actions are wired up, but this workspace is still in demo mode."
              : `Bulk update applied to ${query.bulkUpdated} lead${query.bulkUpdated === "1" ? "" : "s"}.`}
          </div>
        ) : null}

        {query.leadArchived ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(241,245,249,0.96),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-slate-900 shadow-[0_12px_40px_rgba(148,163,184,0.12)]">
            Lead archived and removed from the active workflow lists.
          </div>
        ) : null}

        {query.leadDeleted ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.94),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.12)]">
            Lead permanently deleted.
          </div>
        ) : null}

        {query.permissionError ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.14)]">
            {query.permissionError === "create"
              ? "Only workspace owners and admins can create or reclassify leads."
              : "Only workspace owners and admins can change lead stage, follow-up timing, or saved intelligence."}
          </div>
        ) : null}

        {query.dangerError ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.96),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.14)]">
            {query.dangerError}
          </div>
        ) : null}

        {canEditLeadRecords ? (
          <CreateLeadForm workspaceSlug={workspace.slug} mode={workspace.mode} />
        ) : (
          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Lead intake</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Read-only for members</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Members can review leads, write notes, and generate drafts, but only owners and admins can create leads or change workflow from the inbox.
            </p>
          </section>
        )}

        <section className="min-w-0 rounded-[1.85rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,248,255,0.92))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-teal-700">Inbox filters</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Narrow the queue before you act
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Filter by stage, tag, or keywords across the lead title, inquiry, AI summary, and next action.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white/75 px-3 py-1 text-xs font-medium text-slate-700">
              {filteredLeads.length} of {leads.length} leads shown
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {viewOptions.map((view) => {
              const label =
                view === "all"
                  ? "All"
                  : view === "overdue"
                    ? "Overdue"
                    : view === "hot"
                      ? "Hot"
                      : view === "awaiting-reply"
                        ? "Awaiting reply"
                        : "Won";
              const params = new URLSearchParams();
              if (query.q) params.set("q", query.q);
              if (selectedStage !== "All") params.set("stage", selectedStage);
              if (selectedTag) params.set("tag", selectedTag);
              if (selectedSort !== "follow-up") params.set("sort", selectedSort);
              if (view !== "all") params.set("view", view);

              return (
                <Link
                  key={view}
                  href={`/w/${workspace.slug}/leads${params.toString() ? `?${params.toString()}` : ""}`}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selectedView === view
                      ? "bg-[linear-gradient(135deg,#0f766e,#0f172a)] !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)]"
                      : "border border-slate-300 bg-white/75 text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <form className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.7fr_0.9fr_0.8fr_auto]">
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Search</span>
              <input
                name="q"
                defaultValue={query.q ?? ""}
                placeholder="Search names, companies, tags, objections, next actions..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Stage</span>
              <select
                name="stage"
                defaultValue={selectedStage}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Sort</span>
              <select
                name="sort"
                defaultValue={selectedSort}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
              >
                <option value="follow-up">Follow-up</option>
                <option value="priority">Priority</option>
                <option value="name">Name</option>
                <option value="stage">Stage</option>
              </select>
            </label>

            <input type="hidden" name="view" value={selectedView} />

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Tag</span>
              <select
                name="tag"
                defaultValue={selectedTag}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
              >
                <option value="">All tags</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <button
                type="submit"
                className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)]"
              >
                Apply
              </button>
              <Link
                href={`/w/${workspace.slug}/leads`}
                className="rounded-full border border-slate-300 bg-white/75 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        {canEditLeadRecords ? (
          <form
            id="bulk-leads-form"
            action={bulkUpdateLeadsAction}
            className="min-w-0 rounded-[1.85rem] border border-white/60 bg-[linear-gradient(180deg,rgba(240,253,250,0.96),rgba(255,255,255,0.92))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-6"
          >
            <input type="hidden" name="workspaceSlug" value={workspace.slug} />
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-teal-700">Bulk workflow</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Update multiple leads together</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  Select leads below, then apply a shared stage, follow-up date, or tag in one action.
                </p>
              </div>
              <div className="rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-medium text-teal-900">
                Check lead cards to add them
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_0.9fr_1fr_auto]">
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Action</span>
                <select
                  name="bulkAction"
                  defaultValue="set-stage"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
                >
                  <option value="set-stage">Set stage</option>
                  <option value="set-follow-up">Set follow-up</option>
                  <option value="add-tag">Add tag</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-medium">Stage</span>
                <select
                  name="stage"
                  defaultValue="Qualified"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
                >
                  {quickStageOptions.map((stage) => (
                    <option key={`bulk-${stage}`} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  <span className="font-medium">Follow-up date</span>
                  <input
                    name="followUpDate"
                    type="date"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span className="font-medium">Tag</span>
                  <input
                    name="bulkTag"
                    placeholder="vip, enterprise, referral"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
                  />
                </label>
              </div>

              <div className="flex items-end">
                <FormSubmitButton
                  idleLabel="Apply bulk action"
                  pendingLabel="Applying..."
                  className="w-full rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-5 py-3 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </div>
          </form>
        ) : null}

        <div className="grid min-w-0 gap-4">
          {filteredLeads.map((lead) => (
            <article
              key={lead.id}
              className="min-w-0 overflow-hidden rounded-[1.85rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.9))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/w/${workspace.slug}/leads/${lead.id}`}
                      className="text-xl font-semibold text-slate-950 underline-offset-4 hover:text-teal-800 hover:underline"
                    >
                      {lead.name}
                    </Link>
                    <span className="rounded-full bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-3 py-1 text-xs text-white">
                      {lead.stage}
                    </span>
                    <span className="rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-xs text-slate-600">
                      {lead.source}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        lead.priority === "Urgent"
                          ? "border border-rose-200 bg-rose-50 text-rose-900"
                          : lead.priority === "High"
                            ? "border border-amber-200 bg-amber-50 text-amber-900"
                            : lead.priority === "Medium"
                              ? "border border-sky-200 bg-sky-50 text-sky-900"
                              : "border border-slate-200 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {lead.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{lead.company}</p>
                  <p className="mt-3 text-sm font-medium text-slate-900">{lead.title}</p>
                  <p className="mt-4 break-words text-sm leading-6 text-slate-700">
                    <span className="font-medium text-slate-900">Latest inquiry:</span>{" "}
                    {lead.lastMessage}
                  </p>
                  {hasDistinctSummary(lead.summary, lead.lastMessage) ? (
                    <p className="mt-3 break-words text-sm leading-6 text-slate-600">
                      <span className="font-medium text-slate-900">AI summary:</span>{" "}
                      {lead.summary}
                    </p>
                  ) : null}
                </div>

                <div className="w-full rounded-[1.6rem] border border-teal-100 bg-[linear-gradient(180deg,rgba(240,253,250,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_50px_rgba(45,212,191,0.12)] sm:max-w-xs">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    Suggested next step
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {lead.nextAction}
                  </p>
                  <p className="mt-4 text-sm font-medium text-slate-950">
                    Follow-up due: {lead.followUp}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap gap-2">
                {canEditLeadRecords ? (
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      name="leadIds"
                      value={lead.id}
                      form="bulk-leads-form"
                      className="size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                    />
                    Select
                  </label>
                ) : null}
                <Link
                  href={`/w/${workspace.slug}/leads/${lead.id}`}
                  className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-4 py-2 text-xs font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)]"
                >
                  Open lead
                </Link>
                <Link
                  href={`/w/${workspace.slug}/leads/${lead.id}#reply-composer`}
                  className="rounded-full border border-slate-300 bg-white/75 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
                >
                  Address lead
                </Link>
                <form action={generateReplyDraftAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <FormSubmitButton
                    idleLabel="Generate draft"
                    pendingLabel="Generating..."
                    className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900 transition hover:border-sky-300 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>
                {canEditLeadRecords ? (
                <form action={quickUpdateLeadAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="advance" />
                  <FormSubmitButton
                    idleLabel="Advance stage"
                    pendingLabel="Updating..."
                    className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-900 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>
                ) : null}
                {canEditLeadRecords ? (
                <form action={quickUpdateLeadAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="tomorrow" />
                  <FormSubmitButton
                    idleLabel="Follow up tomorrow"
                    pendingLabel="Updating..."
                    className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>
                ) : null}
                {canEditLeadRecords ? (
                <form action={quickUpdateLeadAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="won" />
                  <FormSubmitButton
                    idleLabel="Mark won"
                    pendingLabel="Updating..."
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </form>
                ) : null}
                </div>
                {canEditLeadRecords ? (
                <div className="grid gap-3 lg:grid-cols-2">
                <form
                  action={quickUpdateLeadAction}
                  className="flex flex-col gap-2 rounded-[1.2rem] border border-slate-200 bg-white/80 p-3"
                >
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="set-stage" />
                  <select
                    name="stage"
                    defaultValue={lead.stage}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500"
                  >
                    {quickStageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <FormSubmitButton
                    idleLabel="Move stage"
                    pendingLabel="Moving..."
                    className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-70 sm:self-start"
                  />
                </form>
                <form
                  action={quickUpdateLeadAction}
                  className="flex flex-col gap-2 rounded-[1.2rem] border border-slate-200 bg-white/80 p-3"
                >
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="action" value="set-follow-up" />
                  <input
                    name="followUpDate"
                    type="date"
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500"
                  />
                  <FormSubmitButton
                    idleLabel="Set follow-up"
                    pendingLabel="Saving..."
                    className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 transition hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 disabled:cursor-not-allowed disabled:opacity-70 sm:self-start"
                  />
                </form>
                </div>
                ) : (
                <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-white/80 p-3 text-xs leading-6 text-slate-600">
                  Inbox workflow controls are limited to owners and admins. Members can still open the lead, write notes, and generate drafts.
                </div>
                )}
                <div className="flex flex-wrap gap-2">
                {lead.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900"
                  >
                    {tag}
                  </span>
                ))}
                </div>
              </div>
            </article>
          ))}

          {filteredLeads.length === 0 ? (
            <div className="rounded-[1.85rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,248,255,0.92))] p-8 text-center shadow-[0_24px_80px_rgba(148,163,184,0.16)]">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">No matches</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Try a broader filter or clear one of the constraints
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Search works across lead titles, inquiries, AI summaries, next actions, and tags.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
