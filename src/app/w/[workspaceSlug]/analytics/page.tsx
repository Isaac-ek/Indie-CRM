import { AppShell } from "@/components/app-shell";
import { getWorkspaceAnalytics, getWorkspaceAuditLogs } from "@/lib/analytics-queries";
import { getWorkspaceContext } from "@/lib/workspaces";

type AnalyticsPageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const analytics = await getWorkspaceAnalytics(workspaceSlug);
  const auditLogs = await getWorkspaceAuditLogs(workspaceSlug, 8);

  return (
    <AppShell
      currentPath="/analytics"
      workspace={workspace}
      eyebrow="CRM v2 Intelligence"
      title="Analytics, Reporting & Audit Logs"
      description="Real-time workspace metric tracking, close rates, pipeline stage distribution, and enterprise audit trail."
    >
      <div className="flex flex-col gap-6 text-slate-900">
        {/* Header Hero */}
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Workspace Intelligence (CRM v2)
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Pipeline & Team Performance
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium text-slate-300 leading-relaxed">
                Aggregated conversion rates, lead scoring distributions, and activity metrics across {workspace.name}.
              </p>
            </div>

            {/* Quick Export Actions */}
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`/api/workspaces/${workspaceSlug}/export-report`}
                download
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:from-teal-400 hover:to-sky-400"
              >
                <span>📥</span>
                <span>Export Leads (CSV)</span>
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Close Rate</p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-400">{analytics.closeRatePercentage}%</p>
              <p className="mt-1 text-xs text-slate-400">{analytics.wonLeads} Won / {analytics.wonLeads + analytics.lostLeads} Closed</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Leads</p>
              <p className="mt-1 text-3xl font-extrabold text-teal-300">{analytics.activeLeads}</p>
              <p className="mt-1 text-xs text-slate-400">Total pipeline: {analytics.totalLeads} leads</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Lead Score</p>
              <p className="mt-1 text-3xl font-extrabold text-amber-300">{analytics.avgLeadScore}/100</p>
              <p className="mt-1 text-xs text-slate-400">AI budget & priority weighted</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">AI Generations</p>
              <p className="mt-1 text-3xl font-extrabold text-sky-400">{analytics.aiGenerationsCount}</p>
              <p className="mt-1 text-xs text-slate-400">Tags, summaries, drafts & memory</p>
            </div>
          </div>
        </header>

        {/* Section 1: Stage Funnel Distribution */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Lead Stage Conversion Funnel</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Distribution of leads across the workspace sales lifecycle.
          </p>

          <div className="mt-6 space-y-4">
            {analytics.stageBreakdown.map((item) => (
              <div key={item.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 uppercase tracking-wide">{item.stage}</span>
                  <span className="text-slate-600">{item.count} leads ({item.percentage}%)</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.stage === "WON"
                        ? "bg-emerald-500"
                        : item.stage === "LOST"
                        ? "bg-rose-400"
                        : item.stage === "PROPOSAL"
                        ? "bg-sky-500"
                        : item.stage === "QUALIFIED"
                        ? "bg-teal-500"
                        : "bg-slate-400"
                    }`}
                    style={{ width: `${Math.max(item.percentage, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Source & Priority Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Source Breakdown */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Inbound Lead Sources</h3>
            <p className="mt-1 text-xs text-slate-600">Origin of leads captured in workspace.</p>

            <div className="mt-4 space-y-3">
              {analytics.sourceBreakdown.map((src) => (
                <div
                  key={src.source}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <span className="text-sm font-bold text-slate-800">{src.source}</span>
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-900">
                    {src.count} leads
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Priority Breakdown */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Lead Priority Distribution</h3>
            <p className="mt-1 text-xs text-slate-600">Urgency level of active lead conversations.</p>

            <div className="mt-4 space-y-3">
              {analytics.priorityBreakdown.map((prio) => (
                <div
                  key={prio.priority}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <span className="text-sm font-bold text-slate-800">{prio.priority}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      prio.priority === "URGENT"
                        ? "bg-rose-100 text-rose-900"
                        : prio.priority === "HIGH"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {prio.count} leads
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Section 3: Enterprise Audit Logs & Security Activity (CRM v2) */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                🛡️ Enterprise Audit Log Trail
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Immutable activity log tracking AI generations, lead mutations, role updates, and queue events.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Last {auditLogs.length} events
            </span>
          </div>

          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition">
                <div className="flex items-start gap-3">
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold tracking-wider uppercase ${
                      log.action.includes("CREATED")
                        ? "bg-emerald-100 text-emerald-800"
                        : log.action.includes("UPDATED")
                        ? "bg-sky-100 text-sky-800"
                        : log.action.includes("QUEUE") || log.action.includes("WEBHOOK")
                        ? "bg-purple-100 text-purple-800"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-900">{log.summary}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Actor: <span className="font-semibold text-slate-700">{log.actorName}</span>
                      {log.actorEmail ? ` (${log.actorEmail})` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 shrink-0 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

