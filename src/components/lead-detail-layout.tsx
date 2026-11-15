import Link from "next/link";
import type { ReactNode } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type LeadDetailLayoutProps = {
  workspaceSlug: string;
  workspaceMode: "database" | "demo";
  canEditLeadRecords: boolean;
  canDeleteLeadRecords: boolean;
  publicDemo?: boolean;
  lead: {
    id: string;
    name: string;
    email: string;
    company: string;
    phone: string;
    industry: string;
    website: string;
    companyNotes: string;
    title: string;
    stage: string;
    source: string;
    priority: string;
    followUp: string;
    summary: string;
    nextAction: string;
    score?: number | null;
    tags: string[];
    isArchived?: boolean;
    similarLeads: Array<{
      id: string;
      name: string;
      company: string;
      stage: string;
      score: number;
      summary: string;
      matchedExcerpt: string;
      tags: string[];
    }>;
    aiOutputs: Array<{
      id: string;
      label: string;
      body: string;
    }>;
    notes: Array<{
      id: string;
      content: string;
      author: string;
      createdAt: string;
    }>;
  };
  hasDistinctSummary: boolean;
  components: {
    replyComposer: ReactNode;
    activityTimeline: ReactNode;
    leadProfileForm: ReactNode;
    leadIntelligenceForm: ReactNode;
    leadWorkflowForm: ReactNode;
    replyDraftForm: ReactNode;
    leadNoteForm: ReactNode;
    followUpRecommendationAction: (formData: FormData) => Promise<void>;
    archiveLeadAction: (formData: FormData) => Promise<void>;
    deleteLeadAction: (formData: FormData) => Promise<void>;
  };
  queryNotifications: {
    noteCreated?: string;
    draftCreated?: string;
    replySent?: string;
    workflowUpdated?: string;
    intelligenceUpdated?: string;
    profileUpdated?: string;
    followUpRecommended?: string;
    permissionError?: string;
    dangerError?: string;
  };
};

export function LeadDetailLayout({
  workspaceSlug,
  workspaceMode,
  canEditLeadRecords,
  canDeleteLeadRecords,
  publicDemo = false,
  lead,
  hasDistinctSummary,
  components,
  queryNotifications: query,
}: LeadDetailLayoutProps) {
  const saved =
    query.noteCreated ||
    query.workflowUpdated ||
    query.intelligenceUpdated ||
    query.profileUpdated ||
    query.draftCreated ||
    query.replySent ||
    query.followUpRecommended;
  const preview = saved === "demo";
  return (
    <div className="grid min-w-0 gap-5">
      {saved && (
        <p role="status" className="crm-notice">
          {preview
            ? "Preview only: changes were not saved."
            : query.noteCreated
              ? "Note saved successfully."
              : query.workflowUpdated
                ? "Lead workflow & stage updated."
                : query.replySent
                  ? "Outbound reply saved to conversation timeline."
                  : query.draftCreated
                    ? "Reply draft generated successfully."
                    : "Lead updated."}
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
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <Link
            href={`/w/${workspaceSlug}/leads`}
            className="text-xs font-medium text-teal-800 hover:underline"
          >
            ← Pipeline
          </Link>
          <p className="mt-3 text-base font-medium text-slate-800">
            {lead.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {lead.company || "Independent contact"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditLeadRecords && (
            <a
              href="#internal-note"
              className="crm-button crm-button-secondary"
            >
              Add note
            </a>
          )}
          <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900">
            {lead.stage}
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
            {lead.priority} priority
          </span>
          {lead.isArchived && (
            <span className="text-xs text-slate-500">Archived</span>
          )}
        </div>
      </header>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <aside
          aria-label="Next action and lead details"
          className="grid min-w-0 gap-4 xl:col-start-2 xl:row-start-1"
        >
          <section className="rounded-xl border border-teal-200 bg-white p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-teal-800">
              Next action
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-800">
              {lead.nextAction || "Choose a next step for this lead."}
            </p>
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Follow-up{" "}
              <strong className="ml-2 font-semibold text-slate-800">
                {lead.followUp || "Unscheduled"}
              </strong>
            </p>
            {canEditLeadRecords && (
              <details open={!!query.intelligenceUpdated} className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-teal-800 underline underline-offset-4">
                  Edit next action, summary & tags
                </summary>
                <div className="mt-3">{components.leadIntelligenceForm}</div>
              </details>
            )}
          </section>
          {canEditLeadRecords ? (
            <section className="crm-panel">
              <h2 className="mb-4 text-sm font-semibold">Stage & follow-up</h2>
              {components.leadWorkflowForm}
            </section>
          ) : (
            <p className="text-xs text-slate-500">
              You have read-only access to this lead.
            </p>
          )}
          <details className="crm-panel" open={!!query.profileUpdated}>
            <summary className="cursor-pointer text-sm font-semibold">
              Contact details
            </summary>
            <dl className="mt-4 grid gap-3 break-words text-xs">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="mt-1 text-slate-700">
                  {lead.email || "No email added"}
                </dd>
              </div>
              {lead.phone && (
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="mt-1 text-slate-700">{lead.phone}</dd>
                </div>
              )}
              {lead.website && (
                <div>
                  <dt className="text-slate-500">Website</dt>
                  <dd className="mt-1 text-slate-700">{lead.website}</dd>
                </div>
              )}
              {lead.industry && (
                <div>
                  <dt className="text-slate-500">Industry</dt>
                  <dd className="mt-1 text-slate-700">{lead.industry}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Source</dt>
                <dd className="mt-1 text-slate-700">{lead.source}</dd>
              </div>
            </dl>
            {lead.companyNotes && (
              <p className="mt-4 text-xs leading-5 text-slate-600">
                {lead.companyNotes}
              </p>
            )}
            {lead.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {lead.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {canEditLeadRecords && (
              <details open={!!query.profileUpdated} className="mt-4">
                <summary className="cursor-pointer text-xs font-medium text-teal-800 underline underline-offset-4">
                  Edit contact
                </summary>
                <div className="mt-3">{components.leadProfileForm}</div>
              </details>
            )}
          </details>
          {canEditLeadRecords && (
            <details className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-xs text-slate-500">
                Archive or delete
              </summary>
              <div className="mt-4 grid gap-4">
                <form
                  action={components.archiveLeadAction}
                  className="grid gap-2"
                >
                  <input
                    type="hidden"
                    name="workspaceSlug"
                    value={workspaceSlug}
                  />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className="crm-label">
                    Type ARCHIVE to confirm
                    <input
                      name="confirmation"
                      placeholder="ARCHIVE"
                      className="crm-input"
                    />
                  </label>
                  <FormSubmitButton
                    idleLabel="Archive Lead"
                    pendingLabel="Archiving..."
                    className="crm-button crm-button-secondary"
                  />
                </form>
                {canDeleteLeadRecords ? (
                  <form
                    action={components.deleteLeadAction}
                    className="grid gap-2 border-t border-slate-100 pt-4"
                  >
                    <input
                      type="hidden"
                      name="workspaceSlug"
                      value={workspaceSlug}
                    />
                    <input type="hidden" name="leadId" value={lead.id} />
                    <p className="text-xs leading-5 text-slate-500">
                      Permanently removes this lead and its conversation.
                    </p>
                    <label className="crm-label">
                      Type DELETE to confirm
                      <input
                        name="confirmation"
                        placeholder="DELETE"
                        className="crm-input"
                      />
                    </label>
                    <FormSubmitButton
                      idleLabel="Delete Permanently"
                      pendingLabel="Deleting..."
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
                    />
                  </form>
                ) : (
                  <p className="text-xs leading-5 text-slate-500">
                    Deleting leads requires an owner or admin. Members can edit
                    leads and add notes.
                  </p>
                )}
              </div>
            </details>
          )}
        </aside>
        <div className="grid min-w-0 gap-5 xl:col-start-1 xl:row-start-1">
          {hasDistinctSummary && (
            <section className="crm-panel">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Brief
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {lead.summary}
              </p>
            </section>
          )}
          {canEditLeadRecords && (
            <section id="internal-note" className="crm-panel scroll-mt-5">
              <h2 className="mb-4 text-sm font-semibold">Add a note</h2>
              {components.leadNoteForm}
            </section>
          )}
          {components.activityTimeline}
          <details
            id="reply-composer"
            open={!!query.replySent}
            className="crm-panel scroll-mt-5"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              Record an outbound reply
            </summary>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Keep a copy of your reply here. This does not send an email.
            </p>
            <div className="mt-4">{components.replyComposer}</div>
          </details>
          {!publicDemo && (
            <details
              open={!!query.draftCreated || !!query.followUpRecommended}
              className="crm-panel"
            >
              <summary className="cursor-pointer text-sm font-semibold">
                AI assistance & related leads
              </summary>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Review suggestions before using them.{" "}
                {workspaceMode === "demo"
                  ? "Preview mode uses sample data."
                  : "Available suggestions depend on the workspace’s configured provider."}
              </p>
              <div className="mt-5 grid gap-5">
                {canEditLeadRecords && (
                  <form action={components.followUpRecommendationAction}>
                    <input
                      type="hidden"
                      name="workspaceSlug"
                      value={workspaceSlug}
                    />
                    <input type="hidden" name="leadId" value={lead.id} />
                    <p className="mb-3 text-xs text-slate-500">
                      This updates the next action and follow-up date on this
                      lead.
                    </p>
                    <FormSubmitButton
                      idleLabel="Recommend Follow-up"
                      pendingLabel="Recommending..."
                      className="crm-button crm-button-secondary"
                    />
                  </form>
                )}
                {components.replyDraftForm}
                <section>
                  <h3 className="text-sm font-medium">Related leads</h3>
                  <div className="mt-3 grid gap-3">
                    {lead.similarLeads.length ? (
                      lead.similarLeads.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <Link
                            href={`/w/${workspaceSlug}/leads/${item.id}`}
                            className="text-sm font-semibold text-teal-800 hover:underline"
                          >
                            {item.name} · {item.company}
                          </Link>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {item.summary}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">
                        No related leads yet.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
