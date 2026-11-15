import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/auth-actions";
import type { WorkspaceContext } from "@/lib/workspaces";

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
  title,
  description,
  children,
}: AppShellProps) {
  const primary = [
    { href: "/leads", label: "Pipeline", icon: "▥" },
    { href: "/search", label: "Search", icon: "⌕" },
  ];
  const secondary = [
    { href: "/analytics", label: "Analytics" },
    { href: "/scanner", label: "AI Scanner" },
    { href: "/settings", label: "Settings & integrations" },
  ];
  return (
    <div className="crm-app min-h-screen bg-[#f7f9f8] text-slate-900 lg:grid lg:grid-cols-[208px_minmax(0,1fr)]">
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <aside className="border-b border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0 lg:p-5">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Link
            href={`/w/${workspace.slug}/leads`}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="flex size-8 items-center justify-center rounded-lg bg-teal-800 text-sm text-white"
            >
              i.
            </span>
            indie<span className="-ml-2 text-slate-400">crm</span>
          </Link>
          <details className="relative lg:mt-8">
            <summary className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold lg:text-sm">
              {workspace.name}
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg lg:left-0">
              {workspace.availableWorkspaces.map((item) => (
                <Link
                  key={item.slug}
                  href={`/w/${item.slug}/leads`}
                  aria-current={
                    item.slug === workspace.slug ? "page" : undefined
                  }
                  className="block rounded-md px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {item.name}
                  <span className="block text-xs text-slate-500">
                    {item.membershipRole}
                  </span>
                </Link>
              ))}
              <p className="border-t border-slate-100 px-3 pt-3 text-xs text-slate-500">
                {workspace.currentUser.name}
              </p>
              <form action={logoutAction}>
                <button className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
        <nav
          aria-label="Main navigation"
          className="mt-4 flex gap-1 lg:mt-7 lg:grid"
        >
          {primary.map((item) => (
            <Link
              key={item.href}
              href={`/w/${workspace.slug}${item.href}`}
              aria-current={currentPath === item.href ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${currentPath === item.href ? "bg-teal-50 text-teal-900" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
          {!workspace.publicDemo && (
            <details
              open={secondary.some((item) => item.href === currentPath)}
              className="relative lg:mt-5"
            >
              <summary className="cursor-pointer rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
                More tools
              </summary>
              <nav
                aria-label="Workspace tools"
                className="absolute right-0 z-20 mt-1 grid w-52 gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg lg:static lg:w-auto lg:border-0 lg:p-0 lg:shadow-none"
              >
                {secondary.map((item) => (
                  <Link
                    key={item.href}
                    href={`/w/${workspace.slug}${item.href}`}
                    aria-current={
                      currentPath === item.href ? "page" : undefined
                    }
                    className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
          )}
        </nav>
        <div className="mt-auto hidden pt-8 text-xs leading-5 text-slate-500 lg:block">
          <p className="font-medium text-slate-700">
            {workspace.currentUser.name}
          </p>
          <p>
            {workspace.membershipRole} •{" "}
            {workspace.mode === "database" ? "Database connected" : "Demo mode"}
          </p>
        </div>
      </aside>
      <main
        id="workspace-content"
        className="min-w-0 px-4 py-6 sm:px-7 lg:px-8 lg:py-8"
      >
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-6">
            <p className="mb-1 text-xs font-medium text-slate-500">
              {workspace.name}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </header>
          {workspace.publicDemo && (
            <aside
              aria-label="Demo guide"
              className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-950"
            >
              <p>
                <strong className="font-semibold">
                  Private sample workspace
                </strong>
                <span className="mx-2 text-teal-400">/</span>One-hour demo ·
                changes save
              </p>
              <details className="basis-full sm:basis-auto">
                <summary className="cursor-pointer font-medium underline underline-offset-4">
                  How to try it
                </summary>
                <div className="mt-3 max-w-xl space-y-2 leading-5">
                  <p>
                    Move Maya’s lead to Qualified, set a follow-up, add a note,
                    then find it with Search. Refresh another tab to see saved
                    changes.
                  </p>
                  <p>
                    Fictional data only. AI uses local sample logic. Uploads,
                    integrations, and team administration are unavailable.
                  </p>
                </div>
              </details>
            </aside>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
