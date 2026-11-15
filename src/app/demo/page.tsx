import Link from "next/link";
import { auth } from "@/auth";
import { publicDemoEnabled } from "@/lib/public-demo";
import { StartDemoButton } from "@/components/start-demo-button";

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ error?: string; expired?: string }> }) {
  const query = await searchParams;
  const session = await auth();
  const enabled = publicDemoEnabled();
  const active = enabled && !query.expired && session?.user.demoSlug && (session.user.demoExpiresAt ?? 0) > Date.now();
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-16 text-slate-100">
      <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-10">
        <p className="text-xs uppercase tracking-[0.25em] text-teal-300">Indie CRM · Public demo</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Take one lead from inquiry to follow-up.</h1>
        <p className="mt-5 leading-7 text-slate-300">Try the working pipeline with fictional clients. You get your own temporary workspace without creating an account.</p>
        <ol className="my-7 list-inside list-decimal space-y-3 text-slate-200">
          <li>Move Maya’s website inquiry to Qualified.</li>
          <li>Open the lead and set a follow-up date.</li>
          <li>Add a note, then find it with search.</li>
        </ol>
        <p className="my-6 text-sm leading-6 text-slate-400">Changes save in this browser’s session for one hour. Another tab in the same browser sees saved changes after refreshing. Other visitors get separate data. Use sample information only. AI uses local sample logic; uploads, integrations, and team administration are unavailable.</p>
        {query.expired && <p role="status" className="my-4 text-amber-200">Your demo has expired. Start a fresh pipeline below.</p>}
        {query.error && <p role="alert" className="my-4 text-amber-200">{query.error === "busy" ? "The demo is busy or you’ve reached the session limit. Please try again later." : "The public demo is not available on this deployment yet."}</p>}
        {active ? <Link className="inline-block rounded-xl bg-teal-300 px-5 py-3 font-semibold text-slate-950" href={`/w/${session!.user.demoSlug}/leads?layout=kanban`}>Continue your demo</Link> : enabled ? (
          <StartDemoButton />
        ) : <p className="text-slate-300">Demo access is not enabled on this deployment.</p>}
        <p className="mt-6 text-sm text-slate-400"><Link href="/login" className="underline underline-offset-4">Sign in to your own workspace</Link></p>
      </section>
    </main>
  );
}
