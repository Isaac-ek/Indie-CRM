import Link from "next/link";
import { registerAction } from "@/lib/auth-actions";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const query = await searchParams;

  const errorMessage =
    query.error === "database_required"
      ? "Registration needs a connected database. Add DATABASE_URL first, then try again."
      : query.error === "password_length"
        ? "Password must be at least 8 characters."
        : query.error === "user_exists"
          ? "An account with that email already exists."
          : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.15),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.14),_transparent_24%),linear-gradient(180deg,_#f7f3e8_0%,_#efe7d5_52%,_#dce4ec_100%)] px-4 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2.2rem] border border-white/70 bg-white/88 p-8 shadow-[0_24px_90px_rgba(148,163,184,0.22)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-sky-700">Register</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Create your workspace
              </h1>
            </div>
            <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900">
              Owner setup
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            This creates the user, workspace, and owner membership in one flow so the
            app starts with real tenant ownership instead of hardcoded assumptions.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-[1.3rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <form action={registerAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Your name</span>
              <input
                name="name"
                type="text"
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                placeholder="Chiemelie Ekezie"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Email</span>
              <input
                name="email"
                type="email"
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                placeholder="you@example.com"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Workspace name</span>
              <input
                name="workspaceName"
                type="text"
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                placeholder="Northstar Studio"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Password</span>
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                placeholder="At least 8 characters"
              />
            </label>

            <button
              type="submit"
              className="mt-2 rounded-full bg-[linear-gradient(135deg,#0284c7,#0f172a)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(2,132,199,0.22)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(2,132,199,0.28)]"
            >
              Create account
            </button>
          </form>

          <div className="mt-6 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            After sign-up, the workspace owner can invite admins or members, and one user can belong to multiple workspaces.
          </div>

          <p className="mt-6 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-sky-800 underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </section>

        <section className="overflow-hidden rounded-[2.2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95))] p-8 text-slate-100 shadow-[0_32px_100px_rgba(15,23,42,0.3)]">
          <p className="text-xs uppercase tracking-[0.32em] text-sky-300">Ownership</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            First user becomes workspace owner
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            This keeps the project aligned with the multi-tenant story: users belong to
            workspaces through memberships, and ownership is an explicit role instead of an
            implied assumption.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              "Explicit owner/admin/member roles",
              "Tenant-safe workspace boundaries",
              "Ready for invites and switching",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
