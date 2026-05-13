import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getSearchData } from "@/lib/data";
import { getWorkspaceContext } from "@/lib/workspaces";

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const { q = "" } = await searchParams;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const search = await getSearchData(workspace.slug, q);
  const hasQuery = search.query.trim().length > 0;

  function buildLeadAnchorHref(
    leadId: string,
    targetKind?: "message" | "note" | "ai",
    targetId?: string,
  ) {
    if (!targetKind || !targetId) {
      return `/w/${workspace.slug}/leads/${leadId}`;
    }

    return `/w/${workspace.slug}/leads/${leadId}#${targetKind}-${targetId}`;
  }

  return (
    <AppShell
      currentPath="/search"
      workspace={workspace}
      eyebrow="Conversation Memory"
      title="Semantic search for client context"
      description="This is where RAG-style retrieval becomes useful instead of gimmicky. The goal is quick memory recall: similar leads, prior objections, and proven reply patterns from the workspace."
    >
      <section className="grid min-w-0 gap-4">
        <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-white sm:p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
                Workspace memory
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
                Search past leads, notes, AI outputs, and conversation history
              </h3>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                This search blends keyword matching with vector similarity over stored
                message embeddings, so you can recall related conversations instead of
                relying on exact wording.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {search.searchedCount} lead{search.searchedCount === 1 ? "" : "s"} indexed
            </div>
          </div>
        </div>

        <form className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-5">
          <label
            htmlFor="q"
            className="text-xs uppercase tracking-[0.24em] text-slate-500"
          >
            Ask the workspace
          </label>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row">
            <input
              id="q"
              name="q"
              defaultValue={search.query}
              placeholder="healthcare fixed estimate, urgent rebrand, stalled retainer..."
              className="min-w-0 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none ring-0 placeholder:text-slate-400 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              Search memory
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {search.suggestions.map((suggestion) => (
              <Link
                key={suggestion}
                href={`/w/${workspace.slug}/search?q=${encodeURIComponent(suggestion)}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </form>

        {hasQuery ? (
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              Showing {search.results.length} match{search.results.length === 1 ? "" : "es"} for{" "}
              <span className="font-semibold text-slate-950">"{search.query}"</span>.
            </div>

            {search.answer ? (
              <section className="min-w-0 rounded-[1.75rem] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.94),rgba(255,255,255,0.96))] p-4 sm:p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Grounded answer</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">What the workspace evidence suggests</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">{search.answer.text}</p>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {search.answer.citations.map((citation, index) => (
                    <Link
                      key={`${citation.leadId}-${index}`}
                      href={buildLeadAnchorHref(
                        citation.leadId,
                        citation.targetKind,
                        citation.targetId,
                      )}
                      className="min-w-0 rounded-2xl border border-emerald-100 bg-white px-4 py-4 text-sm leading-6 text-slate-700 transition hover:border-emerald-300"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">
                        {citation.label} • {citation.leadName}
                      </p>
                      <p className="mt-3">{citation.quote}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            Start with a plain-language search like "urgent branding lead" or "budget
            confirmed healthcare".
          </div>
        )}

        {search.results.length > 0 ? (
          <div className="grid min-w-0 gap-4">
            {search.results.map((result) => (
              <article
                key={result.id}
                className="min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/w/${workspace.slug}/leads/${result.id}`}
                        className="text-xl font-semibold text-slate-950 underline-offset-4 hover:underline"
                      >
                        {result.name}
                      </Link>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white">
                        {result.stage}
                      </span>
                      <span className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600">
                        {result.company}
                      </span>
                    </div>

                    <p className="mt-4 break-words text-sm leading-6 text-slate-700">{result.summary}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {result.matchedOn.map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900"
                        >
                          Matched in {label.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:max-w-xs">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Follow-up
                    </p>
                    <p className="mt-3 text-sm font-medium text-slate-950">{result.followUp}</p>
                    <p className="mt-4 text-xs uppercase tracking-[0.22em] text-slate-500">
                      Relevance
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">
                      {result.score}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  {result.snippets.map((snippet, index) => (
                    <Link
                      key={`${result.id}-snippet-${index}`}
                      href={buildLeadAnchorHref(result.id, snippet.targetKind, snippet.targetId)}
                      className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                    >
                      {snippet.text}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">No matches yet</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              Try a broader phrase or a client problem instead of an exact quote
            </h3>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Good searches include industry names, urgency, budget signals, project
              types, or the moment a lead got stuck. This page currently searches lead
              summaries, tags, messages, notes, and stored AI outputs.
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
