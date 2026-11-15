import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CreateLeadForm } from "@/components/create-lead-form";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getDashboardData } from "@/lib/data";
import {
  filterAndSortInboxLeads,
  inboxSortOptions,
  inboxStageOptions,
  inboxViewOptions,
} from "@/lib/lead-inbox";
import {
  bulkUpdateLeadsAction,
  quickUpdateLeadAction,
} from "@/lib/lead-actions";
import { canManageLeadRecords, getWorkspaceContext } from "@/lib/workspaces";

import { KanbanBoard } from "@/components/kanban-board";

const stageOptions = inboxStageOptions;
const sortOptions = inboxSortOptions;
const viewOptions = inboxViewOptions;
const quickStageOptions = [
  "New",
  "Qualified",
  "Proposal",
  "Follow-up",
  "Won",
  "Lost",
] as const;

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
    layout?: string;
  }>;
};

export default async function LeadsPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const query = await searchParams;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const canEditLeadRecords = canManageLeadRecords(workspace.membershipRole);
  const { leads, followUpQueue } = await getDashboardData(workspace.slug);
  const searchText = query.q?.trim().toLowerCase() ?? "";
  const selectedStage =
    stageOptions.find((option) => option === query.stage) ?? "All";
  const selectedSort =
    sortOptions.find((option) => option === query.sort) ?? "follow-up";
  const selectedView =
    viewOptions.find((option) => option === query.view) ?? "all";
  const layoutMode = query.layout === "list" ? "list" : "kanban";
  const availableTags = Array.from(
    new Set(leads.flatMap((lead) => lead.tags)),
  ).sort();
  const selectedTag = availableTags.includes(query.tag ?? "")
    ? (query.tag ?? "")
    : "";
  const filteredLeads = filterAndSortInboxLeads({
    leads,
    searchText,
    selectedStage,
    selectedSort,
    selectedView,
    selectedTag,
  });

  const pipelineHref = (updates: Record<string, string>) => {
    const params = new URLSearchParams({
      layout: layoutMode,
      view: selectedView,
      sort: selectedSort,
    });
    if (query.q) params.set("q", query.q);
    if (selectedStage !== "All") params.set("stage", selectedStage);
    if (selectedTag) params.set("tag", selectedTag);
    for (const [key, value] of Object.entries(updates)) params.set(key, value);
    return `/w/${workspace.slug}/leads?${params}`;
  };
  const saved =
    query.created ||
    query.quickUpdated ||
    query.bulkUpdated ||
    query.leadArchived ||
    query.leadDeleted;
  const saveIsPreview = [
    query.created,
    query.quickUpdated,
    query.bulkUpdated,
  ].includes("demo");
  const views = [
    ["all", "All leads"],
    ["hot", "High priority"],
    ["awaiting-reply", "Follow-up"],
    ["won", "Won"],
  ] as const;

  return (
    <AppShell
      currentPath="/leads"
      workspace={workspace}
      eyebrow="Workspace"
      title="Pipeline"
      description="Keep the next conversation moving."
    >
      <div className="grid min-w-0 gap-5">
        {saved && (
          <p role="status" className="crm-notice">
            {saveIsPreview
              ? "Preview only: changes were not saved."
              : query.created
                ? "Lead created successfully and added to this workspace."
                : query.leadDeleted
                  ? "Lead deleted."
                  : query.leadArchived
                    ? "Lead archived."
                    : "Pipeline updated."}
          </p>
        )}
        {(query.permissionError || query.dangerError) && (
          <p
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
          >
            {query.permissionError
              ? "Your workspace role does not allow this action."
              : "The confirmation did not match. No changes were made."}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span>
              <strong className="mr-1 text-lg font-semibold text-slate-800">
                {
                  leads.filter((lead) => !["Won", "Lost"].includes(lead.stage))
                    .length
                }
              </strong>{" "}
              open leads
            </span>
            <span>
              <strong className="mr-1 text-lg font-semibold text-slate-800">
                {
                  followUpQueue.filter(
                    (lead) =>
                      lead.timing === "Due today" &&
                      !["Won", "Lost"].includes(lead.stage),
                  ).length
                }
              </strong>{" "}
              due today
            </span>
          </div>
          {canEditLeadRecords && (
            <details className="w-full sm:w-auto sm:max-w-2xl">
              <summary className="crm-button ml-auto w-fit list-none">
                ＋ Add lead
              </summary>
              <div className="mt-3">
                <CreateLeadForm
                  workspaceSlug={workspace.slug}
                  mode={workspace.mode}
                />
              </div>
            </details>
          )}
        </div>
        <section aria-label="Pipeline filters" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <nav aria-label="Pipeline views" className="flex flex-wrap gap-1">
              {views.map(([view, label]) => (
                <Link
                  key={view}
                  href={pipelineHref({ view })}
                  aria-current={selectedView === view ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-xs font-semibold ${selectedView === view ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white"}`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <nav
              aria-label="Pipeline layout"
              className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1"
            >
              {(["kanban", "list"] as const).map((layout) => (
                <Link
                  key={layout}
                  href={pipelineHref({ layout })}
                  aria-current={layoutMode === layout ? "page" : undefined}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${layoutMode === layout ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}
                >
                  {layout === "kanban" ? "Board" : "List"}
                </Link>
              ))}
            </nav>
          </div>
          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="layout" value={layoutMode} />
            <input type="hidden" name="view" value={selectedView} />
            <label className="crm-label min-w-48 flex-1">
              <span className="sr-only">Search pipeline</span>
              <input
                className="crm-input"
                name="q"
                defaultValue={query.q ?? ""}
                placeholder="Search leads, companies, next actions…"
              />
            </label>
            <label className="crm-label">
              <span className="sr-only">Stage</span>
              <select
                name="stage"
                defaultValue={selectedStage}
                className="crm-input"
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage === "All" ? "All stages" : stage}
                  </option>
                ))}
              </select>
            </label>
            <details className="relative">
              <summary className="crm-button crm-button-secondary cursor-pointer">
                More filters
                {selectedTag || selectedSort !== "follow-up" ? " •" : ""}
              </summary>
              <div className="absolute right-0 z-20 mt-2 grid w-56 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
                <label className="crm-label">
                  Sort
                  <select
                    className="crm-input"
                    name="sort"
                    defaultValue={selectedSort}
                  >
                    <option value="follow-up">Follow-up</option>
                    <option value="priority">Priority</option>
                    <option value="name">Name</option>
                    <option value="stage">Stage</option>
                  </select>
                </label>
                <label className="crm-label">
                  Tag
                  <select
                    className="crm-input"
                    name="tag"
                    defaultValue={selectedTag}
                  >
                    <option value="">All tags</option>
                    {availableTags.map((tag) => (
                      <option key={tag}>{tag}</option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
            <button className="crm-button crm-button-secondary">Apply</button>
            {(query.q ||
              selectedStage !== "All" ||
              selectedTag ||
              selectedView !== "all") && (
              <Link
                href={`/w/${workspace.slug}/leads?layout=${layoutMode}`}
                className="py-2 text-xs font-medium text-teal-800 underline"
              >
                Clear filters
              </Link>
            )}
          </form>
        </section>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>
            {filteredLeads.length}{" "}
            {filteredLeads.length === 1 ? "lead" : "leads"}
            {filteredLeads.length !== leads.length ? ` of ${leads.length}` : ""}
          </p>
          <p>
            {layoutMode === "kanban"
              ? "Scroll across stages · use Move to change a stage"
              : "Open a lead to see its conversation"}
          </p>
        </div>
        {filteredLeads.length === 0 ? (
          <div className="crm-panel py-12 text-center">
            <h2 className="font-semibold">
              {leads.length
                ? "No leads match these filters"
                : "Your pipeline starts here"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {leads.length
                ? "Clear a filter or try a different search."
                : "Add a lead to track the conversation and plan your follow-up."}
            </p>
          </div>
        ) : layoutMode === "kanban" ? (
          <KanbanBoard
            workspaceSlug={workspace.slug}
            canEdit={canEditLeadRecords && workspace.mode === "database"}
            leads={filteredLeads.map((lead) => ({
              id: lead.id,
              title: lead.title,
              stage: lead.stage,
              priority: lead.priority,
              contactName: lead.name,
              company: lead.company,
              tags: lead.tags,
              nextAction: lead.nextAction,
              followUp: lead.followUp,
            }))}
          />
        ) : (
          <>
            {canEditLeadRecords && (
              <details className="rounded-lg border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600">
                  Update selected leads
                </summary>
                <form
                  id="bulk-leads-form"
                  action={bulkUpdateLeadsAction}
                  className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
                >
                  <input
                    type="hidden"
                    name="workspaceSlug"
                    value={workspace.slug}
                  />
                  <label className="crm-label">
                    Action
                    <select name="bulkAction" className="crm-input">
                      <option value="set-stage">Set stage</option>
                      <option value="set-follow-up">Set follow-up</option>
                      <option value="add-tag">Add tag</option>
                    </select>
                  </label>
                  <label className="crm-label">
                    Stage
                    <select
                      name="stage"
                      defaultValue="Qualified"
                      className="crm-input"
                    >
                      {quickStageOptions.map((stage) => (
                        <option key={stage}>{stage}</option>
                      ))}
                    </select>
                  </label>
                  <label className="crm-label">
                    Follow-up date
                    <input
                      type="date"
                      name="followUpDate"
                      className="crm-input"
                    />
                  </label>
                  <label className="crm-label">
                    Tag
                    <input name="bulkTag" className="crm-input" />
                  </label>
                  <div className="flex items-end">
                    <FormSubmitButton
                      idleLabel="Apply bulk action"
                      pendingLabel="Applying..."
                      className="crm-button"
                    />
                  </div>
                </form>
              </details>
            )}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {filteredLeads.map((lead) => (
                <article
                  key={lead.id}
                  className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {canEditLeadRecords && (
                      <input
                        type="checkbox"
                        name="leadIds"
                        value={lead.id}
                        form="bulk-leads-form"
                        aria-label={`Select ${lead.name}`}
                        className="mt-1 size-4 accent-teal-700"
                      />
                    )}
                    <div className="min-w-0">
                      <Link
                        className="text-sm font-semibold hover:text-teal-800 hover:underline"
                        href={`/w/${workspace.slug}/leads/${lead.id}`}
                      >
                        {lead.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {lead.company}
                      </p>
                      <p className="mt-2 text-xs text-slate-700">
                        {lead.title}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">
                      {lead.nextAction || "Set the next action"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Follow-up: {lead.followUp}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {lead.stage}
                    </span>
                    {canEditLeadRecords && (
                      <form
                        action={quickUpdateLeadAction}
                        className="flex gap-2"
                      >
                        <input
                          type="hidden"
                          name="workspaceSlug"
                          value={workspace.slug}
                        />
                        <input type="hidden" name="leadId" value={lead.id} />
                        <input type="hidden" name="action" value="tomorrow" />
                        <input type="hidden" name="layout" value="list" />
                        <FormSubmitButton
                          idleLabel="Follow up tomorrow"
                          pendingLabel="Saving..."
                          className="text-xs font-medium text-teal-800 underline underline-offset-4"
                        />
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
