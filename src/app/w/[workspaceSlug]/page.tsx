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
      eyebrow="Dashboard"
      title="Lead intelligence, not inbox chaos"
      description="This first pass gives the project a real SaaS frame: tenant-aware workspace language, clear pipeline visibility, and practical AI outputs that support an actual sales workflow."
    >
      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,245,255,0.88))] px-5 py-5 shadow-[0_18px_55px_rgba(148,163,184,0.15)]"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                {metric.value}
              </p>
              <p className="mt-2 text-sm text-slate-600">{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="min-w-0 rounded-[1.75rem] border border-white/12 bg-[linear-gradient(135deg,rgba(8,20,37,0.96),rgba(15,118,110,0.84))] p-5 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
                Pipeline Snapshot
              </p>
              <h3 className="mt-2 text-xl font-semibold">Current lead mix</h3>
            </div>
            <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs text-slate-100">
              {workspace.mode === "database" ? "Database workspace" : "Demo workspace"}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {stages.map((stage) => (
              <div
                key={stage}
                className="rounded-2xl border border-white/12 bg-white/10 px-4 py-4"
              >
                <p className="text-sm text-slate-300">{stage}</p>
                <p className="mt-3 text-3xl font-semibold">{pipelineCounts[stage]}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.9))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Lead Inbox
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Recent conversations with AI context
              </h3>
            </div>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
              Auto-tagging enabled
            </span>
          </div>

          <div className="mt-6 space-y-4">
              {leads.map((lead) => (
                <article
                  key={lead.id}
                  className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.96))] px-4 py-5 shadow-[0_16px_48px_rgba(148,163,184,0.12)] sm:px-5"
                >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold text-slate-950">{lead.name}</h4>
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
                    <p className="mt-4 break-words text-sm leading-6 text-slate-700">
                      <span className="font-medium text-slate-900">Last message:</span>{" "}
                      {lead.lastMessage}
                    </p>
                    <p className="mt-3 break-words text-sm leading-6 text-slate-600">{lead.summary}</p>
                    <p className="mt-3 break-words text-sm leading-6 text-slate-700">
                      <span className="font-medium text-slate-900">Next action:</span>{" "}
                      {lead.nextAction}
                    </p>
                  </div>

                  <div className="w-full rounded-2xl border border-teal-100 bg-[linear-gradient(180deg,rgba(240,253,250,0.98),rgba(255,255,255,0.92))] px-4 py-4 shadow-[0_18px_50px_rgba(45,212,191,0.12)] sm:w-auto sm:min-w-44">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Follow-up
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">{lead.followUp}</p>
                  </div>
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
              </article>
            ))}
          </div>
        </section>

        <div className="grid min-w-0 gap-6">
          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,248,255,0.92))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Follow-up Queue
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              What needs attention next
            </h3>

            <div className="mt-6 space-y-4">
              {followUpQueue.length > 0 ? (
                followUpQueue.map((item) => (
                  <article
                    key={item.id}
                    className="min-w-0 rounded-[1.4rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(243,248,255,0.94))] px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-950">{item.name}</h4>
                        <p className="mt-1 text-sm text-slate-600">{item.company}</p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
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

                    <div className="mt-3 flex flex-col gap-1 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span>{item.stage}</span>
                      <span>Follow-up {item.followUp}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/w/${workspace.slug}/leads/${item.id}`}
                        className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-4 py-2 text-xs font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)]"
                      >
                        Open lead
                      </Link>
                      <Link
                        href={`/w/${workspace.slug}/leads/${item.id}#reply-composer`}
                        className="rounded-full border border-slate-300 bg-white/75 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
                      >
                        Address lead
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(243,248,255,0.94))] px-4 py-4 text-sm text-slate-600 shadow-[0_14px_40px_rgba(148,163,184,0.12)]">
                  No scheduled follow-ups yet. Set one from any lead record to start building the queue.
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(240,249,255,0.92),rgba(255,255,255,0.9))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              AI Activity
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              Workflow-driven assistance
            </h3>

            <div className="mt-6 space-y-4">
              {activityFeed.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.4rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.96))] px-4 py-4 shadow-[0_14px_40px_rgba(148,163,184,0.12)]"
                >
                  <h4 className="font-semibold text-slate-950">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] p-4 shadow-[0_24px_80px_rgba(148,163,184,0.16)] sm:p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Architecture Guardrails
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              Rules this build will keep
            </h3>

            <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
              <li>Every business record must stay scoped to a workspace tenant.</li>
              <li>AI generations should be stored with provenance and model metadata.</li>
              <li>Webhook payloads should land in an event table before background processing.</li>
              <li>Embeddings should refresh whenever searchable message content changes.</li>
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
