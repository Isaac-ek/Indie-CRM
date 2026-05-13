import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LeadActivityTimeline } from "@/components/lead-activity-timeline";
import { LeadIntelligenceForm } from "@/components/lead-intelligence-form";
import { LeadNoteForm } from "@/components/lead-note-form";
import { LeadProfileForm } from "@/components/lead-profile-form";
import { LeadWorkflowForm } from "@/components/lead-workflow-form";
import { ReplyComposerForm } from "@/components/reply-composer-form";
import { ReplyDraftForm } from "@/components/reply-draft-form";
import {
  archiveLeadAction,
  deleteLeadAction,
  generateFollowUpRecommendationAction,
} from "@/lib/lead-actions";
import { getLeadDetail, hasDistinctSummary } from "@/lib/data";
import { canManageLeadRecords, getWorkspaceContext } from "@/lib/workspaces";
import { FormSubmitButton } from "@/components/form-submit-button";

type PageProps = {
  params: Promise<{ workspaceSlug: string; leadId: string }>;
  searchParams: Promise<{
    noteCreated?: string;
    draftCreated?: string;
    replySent?: string;
    workflowUpdated?: string;
    intelligenceUpdated?: string;
    profileUpdated?: string;
    followUpRecommended?: string;
    permissionError?: string;
    dangerError?: string;
  }>;
};

export default async function LeadDetailPage({ params, searchParams }: PageProps) {
  const { workspaceSlug, leadId } = await params;
  const query = await searchParams;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const canEditLeadRecords = canManageLeadRecords(workspace.membershipRole);
  const lead = await getLeadDetail(workspace.slug, leadId);

  if (!lead) {
    notFound();
  }

  return (
    <AppShell
      currentPath="/leads"
      workspace={workspace}
      eyebrow="Lead Record"
      title={lead.name}
      description="This is the first detailed CRM workspace view: one lead, one timeline, and the AI context needed to decide the next move."
    >
      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid min-w-0 gap-6">
          {query.noteCreated ? (
            <div className="rounded-[1.5rem] border border-teal-200 bg-[linear-gradient(135deg,rgba(204,251,241,0.9),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-teal-950 shadow-[0_12px_40px_rgba(45,212,191,0.14)]">
              {query.noteCreated === "demo"
                ? "Note creation is wired up, but this workspace is still in demo mode."
                : "Note saved to this lead."}
            </div>
          ) : null}

          {query.draftCreated ? (
            <div className="rounded-[1.5rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(224,242,254,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-sky-950 shadow-[0_12px_40px_rgba(56,189,248,0.14)]">
              {query.draftCreated === "demo"
                ? "Reply draft generation is wired up, but this workspace is still in demo mode."
                : "Reply draft generated and added to the AI workspace panel."}
            </div>
          ) : null}

          {query.replySent ? (
            <div className="rounded-[1.5rem] border border-violet-200 bg-[linear-gradient(135deg,rgba(237,233,254,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-violet-950 shadow-[0_12px_40px_rgba(167,139,250,0.14)]">
              {query.replySent === "demo"
                ? "Outbound reply saving is wired up, but this workspace is still in demo mode."
                : "Outbound reply saved to the conversation timeline."}
            </div>
          ) : null}

          {query.workflowUpdated ? (
            <div className="rounded-[1.5rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(254,243,199,0.9),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-amber-950 shadow-[0_12px_40px_rgba(251,191,36,0.14)]">
              {query.workflowUpdated === "demo"
                ? "Workflow editing is wired up, but this workspace is still in demo mode."
                : "Lead stage and follow-up timing updated."}
            </div>
          ) : null}

          {query.intelligenceUpdated ? (
            <div className="rounded-[1.5rem] border border-teal-200 bg-[linear-gradient(135deg,rgba(204,251,241,0.9),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-teal-950 shadow-[0_12px_40px_rgba(45,212,191,0.14)]">
              {query.intelligenceUpdated === "demo"
                ? "Lead intelligence editing is wired up, but this workspace is still in demo mode."
                : "Next action and tags updated."}
            </div>
          ) : null}

          {query.profileUpdated ? (
            <div className="rounded-[1.5rem] border border-cyan-200 bg-[linear-gradient(135deg,rgba(236,254,255,0.94),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-cyan-950 shadow-[0_12px_40px_rgba(34,211,238,0.12)]">
              {query.profileUpdated === "demo"
                ? "Lead profile editing is wired up, but this workspace is still in demo mode."
                : "Lead title and contact profile updated."}
            </div>
          ) : null}

          {query.followUpRecommended ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-[linear-gradient(135deg,rgba(220,252,231,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-emerald-950 shadow-[0_12px_40px_rgba(74,222,128,0.14)]">
              {query.followUpRecommended === "demo"
                ? "Follow-up recommendation is wired up, but this workspace is still in demo mode."
                : "AI follow-up recommendation generated and applied to this lead."}
            </div>
          ) : null}

          {query.permissionError ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.14)]">
              Only workspace owners and admins can change lead workflow, saved intelligence, or AI-applied follow-up recommendations.
            </div>
          ) : null}

          {query.dangerError ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.96),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.14)]">
              {query.dangerError}
            </div>
          ) : null}

          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.92))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-3 py-1 text-xs text-white">
                {lead.stage}
              </span>
              <span className="rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-xs text-slate-600">
                {lead.source}
              </span>
              <Link
                href={`/w/${workspace.slug}/leads`}
                className="text-sm font-medium text-teal-800 underline-offset-4 hover:underline"
              >
                Back to inbox
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Company</p>
                <p className="mt-2 font-medium text-slate-950">{lead.company}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Email</p>
                <p className="mt-2 break-all font-medium text-slate-950">{lead.email}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Opportunity</p>
                <p className="mt-2 font-medium text-slate-950">{lead.title}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Follow-up</p>
                <p className="mt-2 font-medium text-slate-950">{lead.followUp}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Source</p>
                <p className="mt-2 font-medium text-slate-950">{lead.source}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Priority</p>
                <p className="mt-2 font-medium text-slate-950">{lead.priority}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Phone</p>
                <p className="mt-2 font-medium text-slate-950">{lead.phone}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Industry</p>
                <p className="mt-2 font-medium text-slate-950">{lead.industry}</p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Website</p>
                <p className="mt-2 break-all font-medium text-slate-950">{lead.website}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-white/60 bg-white/80 px-4 py-5 shadow-[0_18px_55px_rgba(148,163,184,0.12)] sm:px-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Company notes</p>
              <p className="mt-3 break-words text-sm leading-7 text-slate-700">{lead.companyNotes}</p>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,253,250,0.88))] px-4 py-5 shadow-[0_18px_55px_rgba(148,163,184,0.14)] sm:px-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Summary</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {hasDistinctSummary(lead.summary, lead.messages[0]?.content ?? "")
                  ? lead.summary
                  : "AI summary is still too close to the original inquiry, so the timeline is the clearest source of truth for now."}
              </p>
              <p className="mt-4 text-sm font-medium text-slate-950">
                Next action: {lead.nextAction}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reply workflow</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Take the next action</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Send the next reply from the lead record so the conversation history, follow-up rhythm, and AI context stay in one place.
            </p>

            <div id="reply-composer" className="mt-6">
              <ReplyComposerForm
                workspaceSlug={workspace.slug}
                leadId={lead.id}
                mode={workspace.mode}
              />
            </div>
          </section>

          <LeadActivityTimeline
            leadName={lead.name}
            stage={lead.stage}
            followUp={lead.followUp}
            nextAction={lead.nextAction}
            messages={lead.messages}
            notes={lead.notes}
            aiOutputs={lead.aiOutputs}
          />
        </div>

        <div className="grid min-w-0 gap-6">
          {canEditLeadRecords ? (
            <>
              <LeadProfileForm
                workspaceSlug={workspace.slug}
                leadId={lead.id}
                mode={workspace.mode}
                title={lead.title}
                name={lead.name}
                email={lead.email}
                company={lead.company}
                phone={lead.phone}
                industry={lead.industry}
                website={lead.website}
                companyNotes={lead.companyNotes}
              />

              <LeadIntelligenceForm
                workspaceSlug={workspace.slug}
                leadId={lead.id}
                mode={workspace.mode}
                summary={lead.summary}
                nextAction={lead.nextAction}
                tagsValue={lead.tagsValue}
                tagSuggestions={lead.tagSuggestions}
              />

              <LeadWorkflowForm
                workspaceSlug={workspace.slug}
                leadId={lead.id}
                mode={workspace.mode}
                stage={lead.stage}
                sourceValue={lead.sourceValue}
                priorityValue={lead.priorityValue}
                followUpDateValue={lead.followUpDateValue}
              />
            </>
          ) : (
            <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Lead controls</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Read-only workflow for members</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Members can review the record, write notes, and draft replies, but only owners and admins can change the saved summary, tags, stage, priority, or follow-up timing.
              </p>
            </section>
          )}

          <ReplyDraftForm
            workspaceSlug={workspace.slug}
            leadId={lead.id}
            mode={workspace.mode}
          />

          {canEditLeadRecords ? (
            <form
              action={generateFollowUpRecommendationAction}
              className="min-w-0 rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(236,253,245,0.92),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_55px_rgba(148,163,184,0.14)]"
            >
              <input type="hidden" name="workspaceSlug" value={workspace.slug} />
              <input type="hidden" name="leadId" value={lead.id} />
              <p className="text-sm font-medium text-slate-950">AI follow-up recommendation</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Generate the next recommended follow-up action from the current summary and latest conversation, then apply the suggested timing to this lead.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">
                  {workspace.mode === "database" ? "Stores a follow-up generation and updates next action" : "Demo mode redirect only"}
                </span>
                <FormSubmitButton
                  idleLabel="Recommend follow-up"
                  pendingLabel="Recommending..."
                  className="rounded-full bg-[linear-gradient(135deg,#16a34a,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(22,163,74,0.24)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(22,163,74,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </form>
          ) : null}

          {canEditLeadRecords ? (
            <section className="min-w-0 rounded-[1.75rem] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.94),rgba(255,255,255,0.92))] p-4 shadow-[0_24px_80px_rgba(251,113,133,0.12)] sm:p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Danger zone</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Archive or permanently delete</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use archive to remove the lead from active workflow while keeping history. Delete permanently removes the lead record and its conversation history.
              </p>

              <div className="mt-5 grid gap-4">
                <form
                  action={archiveLeadAction}
                  className="rounded-[1.4rem] border border-rose-100 bg-white/80 p-4"
                >
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Type ARCHIVE to confirm</span>
                    <input
                      name="confirmation"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-400"
                      placeholder="ARCHIVE"
                    />
                  </label>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500">
                      {lead.isArchived ? "This lead is already archived." : "Archive removes it from active inbox and search workflow."}
                    </span>
                    <FormSubmitButton
                      idleLabel={lead.isArchived ? "Archived" : "Archive lead"}
                      pendingLabel="Archiving..."
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                </form>

                <form
                  action={deleteLeadAction}
                  className="rounded-[1.4rem] border border-rose-200 bg-white/80 p-4"
                >
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Type DELETE to confirm permanent removal</span>
                    <input
                      name="confirmation"
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-rose-500"
                      placeholder="DELETE"
                    />
                  </label>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500">
                      Deletes lead, messages, notes, AI generations, and lead-tag assignments.
                    </span>
                    <FormSubmitButton
                      idleLabel="Delete lead"
                      pendingLabel="Deleting..."
                      className="rounded-full bg-[linear-gradient(135deg,#be123c,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(190,24,93,0.24)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(190,24,93,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                </form>
              </div>
            </section>
          ) : null}

          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(240,249,255,0.92),rgba(255,255,255,0.9))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Similar memory</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Related past leads</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Use these matches to answer the practical question behind CRM memory: have we seen a lead like this before, and what did that pattern look like?
            </p>

            <div className="mt-6 space-y-4">
              {lead.similarLeads.length > 0 ? (
                lead.similarLeads.map((similarLead) => (
                  <article
                    key={similarLead.id}
                    className="rounded-[1.4rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.96))] px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/w/${workspace.slug}/leads/${similarLead.id}`}
                            className="text-base font-semibold text-slate-950 underline-offset-4 hover:text-teal-800 hover:underline"
                          >
                            {similarLead.name}
                          </Link>
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
                            {similarLead.stage}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{similarLead.company}</p>
                      </div>
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700">
                          Similarity
                        </p>
                        <p className="mt-1 text-lg font-semibold text-emerald-950">
                          {similarLead.score}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 break-words text-sm leading-6 text-slate-700">{similarLead.summary}</p>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                      {similarLead.matchedExcerpt}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {similarLead.tags.map((tag) => (
                        <span
                          key={`${similarLead.id}-${tag}`}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-white/70 px-4 py-4 text-sm leading-6 text-slate-600">
                  No close semantic matches yet. Add more conversation history or backfill older message embeddings to improve similar-lead retrieval.
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(240,249,255,0.92),rgba(255,255,255,0.9))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">AI Workspace</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Generated context</h3>

            <div className="mt-6 space-y-4">
              {lead.aiOutputs.length > 0 ? (
                lead.aiOutputs.map((output) => (
                  <article
                    key={output.id}
                    className="rounded-[1.4rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.96))] px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]"
                  >
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {output.label}
                    </h4>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{output.body}</p>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-white/70 px-4 py-4 text-sm leading-6 text-slate-600">
                  No AI runs yet. Generate a draft or add AI-assisted lead intelligence to start building provenance-aware history here.
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,237,0.9))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Internal notes</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Team memory</h3>

            <div className="mt-6">
              <LeadNoteForm
                workspaceSlug={workspace.slug}
                leadId={lead.id}
                mode={workspace.mode}
              />
            </div>

            <div className="mt-6 space-y-4">
              {lead.notes.length > 0 ? (
                lead.notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-[1.4rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,247,237,0.92))] px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]"
                  >
                    <p className="text-sm leading-6 text-slate-700">{note.content}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {note.author} • {note.createdAt}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-amber-300 bg-white/70 px-4 py-4 text-sm leading-6 text-slate-600">
                  No internal notes yet. Capture objections, budget context, or your next move so future you can understand the lead faster.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
