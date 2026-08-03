import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/data";
import { getWorkspaceContext } from "@/lib/workspaces";

const stages = ["New", "Qualified", "Proposal", "Follow-up"] as const;

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function WorkspaceDashboardPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const { activityFeed, followUpQueue, leads, metrics, pipelineCounts } = await getDashboardData(
    workspace.slug,
  );

  return (
    <AppShell
      currentPath="/"
      workspace={workspace}
      eyebrow="Dashboard Overview"
      title="Lead Intelligence & Workspace Pipeline"
      description="Real-time visibility into lead pipeline, queued follow-ups, and AI-assisted client intelligence."
    >
      <div className="flex flex-col gap-6 text-slate-900">
        {/* Section 1: Metrics & Pipeline Snapshot */}
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          {/* Executive Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-600">{metric.detail}</p>
              </article>
            ))}
          </div>

          {/* Pipeline Snapshot Hero Card */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Pipeline Snapshot
                </p>
                <h3 className="mt-1 text-2xl font-bold text-white">Current Lead Mix</h3>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                {workspace.mode === "database" ? "Database Workspace" : "Demo Workspace"}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {stages.map((stage) => (
                <div
                  key={stage}
                  className="rounded-xl border border-slate-800 bg-slate-800/80 p-4 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stage}</p>
                  <p className="mt-2 text-3xl font-bold text-white">{pipelineCounts[stage]}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Section 2: Recent Lead Inbox & Action Sidebar */}
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          {/* Main Lead Inbox Feed */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Lead Stream
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  Recent Inquiries & AI Summaries
                </h3>
              </div>
              <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-900">
                Auto-Tagging Enabled
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {leads.map((lead) => (
                <article
                  key={lead.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm transition hover:border-teal-300"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/w/${workspace.slug}/leads/${lead.id}`}
                          className="text-lg font-bold text-slate-900 hover:text-teal-700 hover:underline"
                        >
                          {lead.name}
                        </Link>
                        <span className="rounded-full bg-slate-900 px-3 py-0.5 text-xs font-semibold text-white">
                          {lead.stage}
                        </span>
                        <span className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-xs font-semibold text-slate-700">
                          {lead.source}
                        </span>
                        <span
                          className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                            lead.priority === "Urgent"
                              ? "bg-rose-100 text-rose-900"
                              : lead.priority === "High"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-sky-100 text-sky-900"
                          }`}
                        >
                          {lead.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{lead.company}</p>
                      
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                        <span className="font-bold text-slate-900">Last message:</span>{" "}
                        <span className="text-slate-700">{lead.lastMessage}</span>
                      </div>

                      <p className="mt-3 text-sm text-slate-700 leading-relaxed font-medium">
                        {lead.summary}
                      </p>

                      <div className="mt-3 text-xs font-bold uppercase tracking-wider text-teal-800">
                        Next Action: <span className="text-slate-900 capitalize font-semibold">{lead.nextAction}</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 min-w-[160px] text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-900">
                        Follow-up Date
                      </p>
                      <p className="mt-1 text-lg font-bold text-teal-950">{lead.followUp}</p>
                      <Link
                        href={`/w/${workspace.slug}/leads/${lead.id}`}
                        className="mt-3 block w-full rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-600 transition"
                      >
                        View Record
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-200/60 pt-3">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Right Column: Follow-up Queue & AI Activity */}
          <div className="flex flex-col gap-6">
            {/* Follow-up Queue */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Follow-Up Queue
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Action Required
              </h3>

              <div className="mt-5 space-y-3">
                {followUpQueue.length > 0 ? (
                  followUpQueue.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900">{item.name}</h4>
                          <p className="text-xs font-semibold text-slate-500">{item.company}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            item.timing === "Overdue"
                              ? "bg-rose-100 text-rose-900"
                              : item.timing === "Due today"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {item.timing}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-medium">
                        <span>Stage: {item.stage}</span>
                        <span>Due: {item.followUp}</span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Link
                          href={`/w/${workspace.slug}/leads/${item.id}`}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-slate-800 transition"
                        >
                          Open Lead
                        </Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No scheduled follow-ups pending.</p>
                )}
              </div>
            </section>

            {/* AI Activity */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                AI Activity Feed
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Workflow Assistance Log
              </h3>

              <div className="mt-4 space-y-3">
                {activityFeed.map((item) => (
                  <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">{item.body}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
