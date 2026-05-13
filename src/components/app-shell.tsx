import Link from "next/link";
import { ReactNode } from "react";
import { logoutAction } from "@/lib/auth-actions";
import { WorkspaceContext } from "@/lib/workspaces";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const navItems: NavItem[] = [
  { href: "", label: "Dashboard", description: "Pipeline, follow-ups, and AI activity" },
  { href: "/leads", label: "Leads", description: "Inbox and relationship history" },
  { href: "/search", label: "Search", description: "Semantic memory across conversations" },
  { href: "/settings", label: "Settings", description: "Workspace, prompts, and integrations" },
];

type AppShellProps = {
  currentPath: string;
  workspace: WorkspaceContext;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AppShell({
  currentPath,
  workspace,
  eyebrow,
  title,
  description,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-clip text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1640px] flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 xl:flex-row">
        <aside className="w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,20,37,0.94)_0%,rgba(9,22,40,0.86)_100%)] px-4 py-5 text-slate-100 shadow-[0_30px_100px_rgba(2,6,23,0.55)] backdrop-blur-xl lg:px-5 lg:py-6 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-80 xl:flex-none xl:overflow-y-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between xl:block">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-teal-300">
                Indie CRM
              </p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                AI Tagging Workspace
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 xl:max-w-xs">
                A multi-tenant CRM for solo operators who need clean lead workflows,
                searchable client memory, and practical AI help.
              </p>
            </div>
            <div className="w-fit shrink-0 rounded-full border border-teal-300/25 bg-teal-300/10 px-3 py-1 text-xs font-medium text-teal-100 shadow-[0_0_30px_rgba(45,212,191,0.14)]">
              MVP Build
            </div>
          </div>

          <form action={logoutAction} className="mt-5">
            <button
              type="submit"
              className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/12"
            >
              Sign out
            </button>
          </form>

          <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-teal-200">
              Workspaces
            </p>
            <div className="mt-4 grid gap-2">
              {workspace.availableWorkspaces.map((item) => {
                const active = item.slug === workspace.slug;

                return (
                  <Link
                    key={item.slug}
                    href={`/w/${item.slug}`}
                    className={`rounded-[1.1rem] border px-3 py-3 transition ${
                      active
                        ? "border-teal-300/50 bg-[linear-gradient(135deg,rgba(20,184,166,0.24),rgba(56,189,248,0.14))] text-white"
                        : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-teal-300/25 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-300">
                      {item.membershipRole}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <nav className="mt-6 grid gap-3 xl:mt-8">
            {navItems.map((item) => {
              const active = currentPath === item.href;
              const href = `/w/${workspace.slug}${item.href}`;

              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`rounded-[1.4rem] border px-4 py-4 transition ${
                    active
                      ? "border-teal-300/50 bg-[linear-gradient(135deg,rgba(20,184,166,0.24),rgba(56,189,248,0.14))] text-white shadow-[0_12px_40px_rgba(20,184,166,0.18)]"
                      : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-teal-300/25 hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-300">
                    {item.description}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 xl:mt-8">
            <p className="text-xs uppercase tracking-[0.28em] text-amber-200">
              Build Priorities
            </p>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              <li>Tenant-aware auth and workspace membership</li>
              <li>Lead inbox with conversations and notes</li>
              <li>AI tagging, summaries, and suggested replies</li>
              <li>Semantic search across prior conversations</li>
            </ul>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(237,245,255,0.88))] p-4 text-slate-950 shadow-[0_30px_100px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-5 lg:p-6">
            <div className="flex flex-col gap-6 border-b border-slate-200/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-teal-700">
                  {eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl xl:text-5xl">
                  {title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                  {description}
                </p>
              </div>
              <div className="grid min-w-0 gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-[0_8px_30px_rgba(148,163,184,0.12)]">
                  <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
                    Workspace
                  </span>
                  <span className="mt-2 block font-medium">{workspace.name}</span>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-[0_8px_30px_rgba(148,163,184,0.12)]">
                  <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
                    Member
                  </span>
                  <span className="mt-2 block font-medium">
                    {workspace.currentUser.name}
                  </span>
                </div>
                <div className="rounded-2xl border border-white/60 bg-[linear-gradient(135deg,rgba(20,184,166,0.09),rgba(255,255,255,0.72))] px-4 py-3 shadow-[0_8px_30px_rgba(148,163,184,0.12)] sm:col-span-2">
                  <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">
                    Access
                  </span>
                  <span className="mt-2 block font-medium">
                    {workspace.membershipRole} •{" "}
                    {workspace.mode === "database" ? "Database connected" : "Demo mode"}
                  </span>
                </div>
              </div>
            </div>

            <div className="min-w-0 pt-6">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
