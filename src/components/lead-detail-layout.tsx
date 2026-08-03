"use client";

import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";
import { FormSubmitButton } from "@/components/form-submit-button";

type LeadDetailLayoutProps = {
  workspaceSlug: string;
  workspaceMode: "database" | "demo";
  canEditLeadRecords: boolean;
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

type TabKey = "timeline" | "ai" | "notes" | "overview" | "settings";

export function LeadDetailLayout({
  workspaceSlug,
  workspaceMode,
  canEditLeadRecords,
  lead,
  hasDistinctSummary,
  components,
  queryNotifications,
}: LeadDetailLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");

  useEffect(() => {
    if (queryNotifications.noteCreated) {
      setActiveTab("notes");
    } else if (queryNotifications.draftCreated || queryNotifications.followUpRecommended) {
      setActiveTab("ai");
    } else if (queryNotifications.replySent) {
      setActiveTab("timeline");
    } else if (
      queryNotifications.workflowUpdated ||
      queryNotifications.intelligenceUpdated ||
      queryNotifications.profileUpdated
    ) {
      setActiveTab("settings");
    }
  }, [queryNotifications]);

  const scoreDisplay =
    typeof lead.score === "number" && !Number.isNaN(lead.score)
      ? `${lead.score} / 100`
      : "75 / 100";

  return (
    <div className="flex flex-col gap-6 text-slate-900">
      {/* Notifications */}
      {queryNotifications.noteCreated && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-950 shadow-sm">
          {queryNotifications.noteCreated === "demo"
            ? "Note creation is ready (demo mode)."
            : "Note saved successfully."}
        </div>
      )}
      {queryNotifications.draftCreated && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950 shadow-sm">
          {queryNotifications.draftCreated === "demo"
            ? "Draft generation is ready (demo mode)."
            : "Reply draft generated successfully."}
        </div>
      )}
      {queryNotifications.replySent && (
        <div className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-950 shadow-sm">
          {queryNotifications.replySent === "demo"
            ? "Outbound reply is ready (demo mode)."
            : "Outbound reply saved to conversation timeline."}
        </div>
      )}
      {queryNotifications.workflowUpdated && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 shadow-sm">
          Lead workflow & stage updated.
        </div>
      )}
      {queryNotifications.intelligenceUpdated && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-950 shadow-sm">
          Lead intelligence updated.
        </div>
      )}
      {queryNotifications.profileUpdated && (
        <div className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-950 shadow-sm">
          Lead profile updated.
        </div>
      )}
      {queryNotifications.followUpRecommended && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 shadow-sm">
          AI follow-up recommendation generated and applied.
        </div>
      )}
      {queryNotifications.permissionError && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-950 shadow-sm">
          Only workspace owners and admins can edit lead settings or AI recommendations.
        </div>
      )}
      {queryNotifications.dangerError && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-950 shadow-sm">
          {queryNotifications.dangerError}
        </div>
      )}

      {/* Header Hero Card */}
      <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={`/w/${workspaceSlug}/leads`}
                className="text-xs font-bold uppercase tracking-wider text-teal-400 hover:text-teal-300"
              >
                ← Back to Inbox
              </Link>
              <span className="rounded-full border border-teal-500/40 bg-teal-950/60 px-3 py-0.5 text-xs font-semibold text-teal-300">
                {lead.stage}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-0.5 text-xs font-medium text-slate-300">
                {lead.source}
              </span>
              <span className="rounded-full border border-amber-500/40 bg-amber-950/60 px-3 py-0.5 text-xs font-semibold text-amber-300">
                Priority: {lead.priority}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {lead.name}
            </h1>
            <p className="mt-1 text-base text-slate-300">
              {lead.title} {lead.company ? `• ${lead.company}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab("timeline")}
              className="rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow hover:bg-teal-400 transition"
            >
              💬 Reply Workflow
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              🤖 AI Insights
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              📝 Add Note
            </button>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{lead.email || "No email"}</p>
            <p className="text-xs text-slate-400">{lead.phone || "No phone"}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Follow-Up</p>
            <p className="mt-1 text-sm font-semibold text-teal-300">{lead.followUp || "Not scheduled"}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lead Score</p>
            <p className="mt-1 text-sm font-semibold text-amber-300">{scoreDisplay}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Action</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{lead.nextAction}</p>
          </div>
        </div>
      </header>

      {/* Categorized Tab Bar */}
      <nav className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-300/80 bg-slate-200/80 p-1.5 shadow-inner">
        {[
          { key: "timeline", label: "💬 Activity & Messages", count: lead.notes.length + lead.aiOutputs.length },
          { key: "ai", label: "🤖 AI Assistance & Memory", count: lead.similarLeads.length },
          { key: "notes", label: "📝 Team Notes", count: lead.notes.length },
          { key: "overview", label: "👤 Profile Overview" },
          { key: "settings", label: "⚙️ Workflow & Settings" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-700 hover:bg-slate-300/60 hover:text-slate-900"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${
                    isActive ? "bg-teal-500 text-slate-950" : "bg-slate-300 text-slate-800"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Categorized Content Area */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main Workspace Column */}
        <main className="min-w-0">
          {/* TAB 1: Activity & Messages */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Compose Outbound Reply</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Send your next response directly from this lead record.
                </p>
                <div className="mt-4">{components.replyComposer}</div>
              </section>

              {components.activityTimeline}
            </div>
          )}

          {/* TAB 2: AI Assistance & Memory */}
          {activeTab === "ai" && (
            <div className="space-y-6">
              {/* AI Summary Box */}
              <section className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-teal-900">
                  🤖 AI Intelligence Summary
                </div>
                <p className="mt-4 text-base font-medium leading-relaxed text-slate-900">
                  {hasDistinctSummary
                    ? lead.summary
                    : "AI summary is currently synthesized from initial lead inquiry."}
                </p>

                <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-900">
                    Recommended Next Action:
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{lead.nextAction}</p>
                </div>
              </section>

              {/* AI Follow-up Action Form */}
              {canEditLeadRecords && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <form action={components.followUpRecommendationAction}>
                    <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                    <input type="hidden" name="leadId" value={lead.id} />
                    <h3 className="text-lg font-bold text-slate-900">Generate AI Follow-up Recommendation</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Calculates optimal follow-up timing and updates lead next action automatically.
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {workspaceMode === "database" ? "Updates database state" : "Demo mode"}
                      </span>
                      <FormSubmitButton
                        idleLabel="Recommend Follow-up"
                        pendingLabel="Recommending..."
                        className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-500 transition"
                      />
                    </div>
                  </form>
                </section>
              )}

              {/* AI Draft Generator Form */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {components.replyDraftForm}
              </section>

              {/* Similar Memory */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Semantic Memory: Related Past Leads</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Leads from workspace memory with similar semantic context.
                </p>

                <div className="mt-4 space-y-4">
                  {lead.similarLeads.length > 0 ? (
                    lead.similarLeads.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/w/${workspaceSlug}/leads/${item.id}`}
                            className="font-bold text-teal-800 hover:underline"
                          >
                            {item.name} ({item.company})
                          </Link>
                          <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-900">
                            {item.score}% similarity
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">{item.summary}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No close semantic matches found yet.</p>
                  )}
                </div>
              </section>

              {/* AI Provenance History */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">AI Provenance History</h3>
                <div className="mt-4 space-y-3">
                  {lead.aiOutputs.length > 0 ? (
                    lead.aiOutputs.map((out) => (
                      <div key={out.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{out.label}</p>
                        <p className="mt-1 text-sm text-slate-800">{out.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No previous AI runs logged for this lead.</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: Team Notes */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Team Notes & Internal Memory</h2>
                <div className="mt-4">{components.leadNoteForm}</div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Saved Internal Notes</h3>
                <div className="mt-4 space-y-4">
                  {lead.notes.length > 0 ? (
                    lead.notes.map((note) => (
                      <article key={note.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                        <p className="text-sm font-medium text-slate-900">{note.content}</p>
                        <p className="mt-2 text-xs font-bold uppercase text-slate-500">
                          {note.author} • {note.createdAt}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No internal notes added yet.</p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: Profile Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Contact & Company Profile</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{lead.name}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{lead.email}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Company</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{lead.company || "N/A"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{lead.phone || "N/A"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Industry</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{lead.industry || "N/A"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Website</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{lead.website || "N/A"}</p>
                  </div>
                </div>

                {lead.companyNotes && (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Company Background</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-800">{lead.companyNotes}</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 5: Settings & Workflow Forms */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {canEditLeadRecords ? (
                <>
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Edit Contact Profile</h3>
                    <div className="mt-4">{components.leadProfileForm}</div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Edit Saved AI Intelligence</h3>
                    <div className="mt-4">{components.leadIntelligenceForm}</div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">Edit Stage, Priority & Follow-Up</h3>
                    <div className="mt-4">{components.leadWorkflowForm}</div>
                  </section>

                  {/* Danger Zone */}
                  <section className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
                    <h3 className="text-lg font-bold text-rose-900">Danger Zone: Archive or Delete</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Permanently delete or archive this lead record.
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <form action={components.archiveLeadAction} className="rounded-xl border border-rose-200 bg-white p-4">
                        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                        <input type="hidden" name="leadId" value={lead.id} />
                        <label className="block text-xs font-bold text-slate-800">Type ARCHIVE to confirm</label>
                        <input name="confirmation" placeholder="ARCHIVE" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
                        <div className="mt-3 flex justify-end">
                          <FormSubmitButton idleLabel="Archive Lead" pendingLabel="Archiving..." className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white" />
                        </div>
                      </form>

                      <form action={components.deleteLeadAction} className="rounded-xl border border-rose-200 bg-white p-4">
                        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                        <input type="hidden" name="leadId" value={lead.id} />
                        <label className="block text-xs font-bold text-rose-800">Type DELETE to confirm</label>
                        <input name="confirmation" placeholder="DELETE" className="mt-2 w-full rounded-lg border border-rose-300 px-3 py-2 text-sm text-slate-900" />
                        <div className="mt-3 flex justify-end">
                          <FormSubmitButton idleLabel="Delete Permanently" pendingLabel="Deleting..." className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white" />
                        </div>
                      </form>
                    </div>
                  </section>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  Read-only workflow: Only owners and admins can modify lead settings or pipeline stages.
                </div>
              )}
            </div>
          )}
        </main>

        {/* Sidebar Controls */}
        <aside className="flex flex-col gap-6">
          {/* Quick Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Details</h3>
            <dl className="mt-4 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Stage</dt>
                <dd className="font-bold text-slate-900">{lead.stage}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Priority</dt>
                <dd className="font-bold text-slate-900">{lead.priority}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Source</dt>
                <dd className="font-bold text-slate-900">{lead.source}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-slate-500">Follow-up</dt>
                <dd className="font-bold text-teal-700">{lead.followUp}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Tags Box */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Lead Tags</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lead.tags.length > 0 ? (
                lead.tags.map((tag) => (
                  <span key={tag} className="rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-900">
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No tags assigned</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
