export default function LeadDetailLoadingPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e2e8f0,#f8fafc)] px-4 py-6">
      <div className="mx-auto max-w-[1500px] animate-pulse">
        <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="rounded-[2rem] bg-slate-900/90 p-6">
            <div className="h-5 w-24 rounded bg-white/20" />
            <div className="mt-4 h-8 w-40 rounded bg-white/20" />
            <div className="mt-8 space-y-3">
              <div className="h-16 rounded-[1.4rem] bg-white/10" />
              <div className="h-16 rounded-[1.4rem] bg-white/10" />
              <div className="h-16 rounded-[1.4rem] bg-white/10" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] bg-white/80 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)]">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="mt-4 h-12 w-72 rounded bg-slate-200" />
              <div className="mt-4 h-5 w-full rounded bg-slate-200" />
              <div className="mt-2 h-5 w-2/3 rounded bg-slate-200" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="h-80 rounded-[1.75rem] bg-white/80 shadow-[0_24px_80px_rgba(148,163,184,0.16)]" />
                <div className="h-72 rounded-[1.75rem] bg-white/80 shadow-[0_24px_80px_rgba(148,163,184,0.16)]" />
                <div className="h-[30rem] rounded-[1.75rem] bg-white/80 shadow-[0_24px_80px_rgba(148,163,184,0.16)]" />
              </div>

              <div className="space-y-6">
                <div className="h-64 rounded-[1.5rem] bg-white/80 shadow-[0_18px_55px_rgba(148,163,184,0.14)]" />
                <div className="h-56 rounded-[1.5rem] bg-white/80 shadow-[0_18px_55px_rgba(148,163,184,0.14)]" />
                <div className="h-52 rounded-[1.5rem] bg-white/80 shadow-[0_18px_55px_rgba(148,163,184,0.14)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
