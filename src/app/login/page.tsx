import Link from "next/link";
import { loginAction } from "@/lib/auth-actions";

type PageProps = {
  searchParams: Promise<{ error?: string; registered?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_#f8f4ea_0%,_#efe6d2_52%,_#dce7df_100%)] px-4 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-[2.2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(23,37,84,0.95))] p-8 text-slate-100 shadow-[0_32px_100px_rgba(15,23,42,0.32)]">
          <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Indie CRM</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Sign in to your workspace
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            Step back into the operating console where lead intake, tenant-safe access, AI memory,
            and real workflow decisions stay connected instead of drifting across tools.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              "Tenant-scoped workspaces",
              "AI-tagged lead memory",
              "Workflow-first inbox actions",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Local demo</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              If you have not connected a database yet, sign in with
              <br />
              <span className="font-medium text-white">owner@northstarstudio.test</span>
              <br />
              <span className="font-medium text-white">demo12345</span>
            </p>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">What changed</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Memberships now drive workspace access, switching, and role-sensitive CRM actions across the app.
            </p>
          </div>
        </section>

        <section className="rounded-[2.2rem] border border-white/70 bg-white/88 p-8 shadow-[0_24px_90px_rgba(148,163,184,0.22)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">Login</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Welcome back
              </h2>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
              Credentials auth
            </div>
          </div>

          {query.error ? (
            <div className="mt-6 rounded-[1.3rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
              {query.error === "invalid_credentials"
                ? "That email and password combination did not work."
                : "Login failed. Please try again."}
            </div>
          ) : null}

          {query.registered ? (
            <div className="mt-6 rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              Account created. Sign in to continue.
            </div>
          ) : null}

          <form action={loginAction} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Email</span>
              <input
                type="email"
                name="email"
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400"
                placeholder="owner@northstarstudio.test"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">Password</span>
              <input
                type="password"
                name="password"
                required
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-400"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              className="mt-2 rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,118,110,0.22)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.28)]"
            >
              Sign in
            </button>
          </form>

          <div className="mt-6 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            Use the same account across multiple client workspaces, then switch contexts from the app shell once you’re inside.
          </div>

          <p className="mt-6 text-sm text-slate-600">
            Need an account?{" "}
            <Link href="/register" className="font-medium text-emerald-800 underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
