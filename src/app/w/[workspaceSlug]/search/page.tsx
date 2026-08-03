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
      title="Semantic Search & Grounded Context"
      description="Hybrid keyword and vector semantic search across past conversations, lead notes, and AI outputs."
    >
      <div className="flex flex-col gap-6 text-slate-900">
        {/* Section 1: Search Header Hero Card */}
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Workspace Memory
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Semantic Client Memory
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium text-slate-300 leading-relaxed">
                Recalls past lead requirements, prior objections, budget signals, and conversation history using stored vector embeddings.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-3 text-sm font-semibold text-teal-300">
              {search.searchedCount} lead{search.searchedCount === 1 ? "" : "s"} indexed
            </div>
          </div>
        </header>

        {/* Section 2: Search Input & Quick Suggestions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="flex flex-col gap-3">
            <label htmlFor="q" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Search Client Memory
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="q"
                name="q"
                defaultValue={search.query}
                placeholder="e.g. healthcare fixed estimate, urgent rebrand, stalled retainer..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <button
                type="submit"
                className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-teal-500 transition"
              >
                Search Memory
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Quick Searches:</span>
              {search.suggestions.map((suggestion) => (
                <Link
                  key={suggestion}
                  href={`/w/${workspace.slug}/search?q=${encodeURIComponent(suggestion)}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900 transition"
                >
                  {suggestion}
                </Link>
              ))}
            </div>
          </form>
        </section>

        {/* Section 3: Grounded Answer Card (if query present) */}
        {hasQuery && search.answer && (
          <section className="rounded-2xl border border-teal-200 bg-teal-50/80 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-900">
              🤖 Grounded AI Workspace Answer
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">
              Synthesized Workspace Evidence
            </h3>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-800">
              {search.answer.text}
            </p>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {search.answer.citations.map((citation, index) => (
                <Link
                  key={`${citation.leadId}-${index}`}
                  href={buildLeadAnchorHref(
                    citation.leadId,
                    citation.targetKind,
                    citation.targetId,
                  )}
                  className="rounded-xl border border-teal-200 bg-white p-4 text-sm leading-relaxed text-slate-900 hover:border-teal-400 shadow-sm transition"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    {citation.label} • {citation.leadName}
                  </p>
                  <p className="mt-2 text-slate-700 font-medium">"{citation.quote}"</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Categorized Match Results */}
        {search.results.length > 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Matched Lead Records ({search.results.length})
            </h3>
            <div className="space-y-4">
              {search.results.map((result) => (
                <article
                  key={result.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/w/${workspace.slug}/leads/${result.id}`}
                          className="text-lg font-bold text-slate-900 hover:text-teal-700 hover:underline"
                        >
                          {result.name}
                        </Link>
                        <span className="rounded-full bg-slate-900 px-3 py-0.5 text-xs font-semibold text-white">
                          {result.stage}
                        </span>
                        <span className="rounded-full border border-slate-300 bg-white px-3 py-0.5 text-xs font-semibold text-slate-700">
                          {result.company}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-800 leading-relaxed font-medium">
                        {result.summary}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {result.matchedOn.map((label) => (
                          <span
                            key={label}
                            className="rounded-lg bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-900"
                          >
                            Matched in {label.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center min-w-[140px]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Relevance
                      </p>
                      <p className="mt-1 text-2xl font-bold text-teal-700">{result.score}%</p>
                    </div>
                  </div>

                  {result.snippets.length > 0 && (
                    <div className="mt-4 grid gap-2 lg:grid-cols-3 border-t border-slate-200/60 pt-3">
                      {result.snippets.map((snippet, index) => (
                        <Link
                          key={`${result.id}-snippet-${index}`}
                          href={buildLeadAnchorHref(result.id, snippet.targetKind, snippet.targetId)}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 hover:border-teal-400 transition"
                        >
                          "{snippet.text}"
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : (
          hasQuery && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No matching records found for "{search.query}". Try a broader term.
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
