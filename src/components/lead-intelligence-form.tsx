"use client";

import type { MouseEvent } from "react";
import { useState } from "react";
import { updateLeadIntelligenceAction } from "@/lib/lead-actions";
import { FormSubmitButton } from "@/components/form-submit-button";

type LeadIntelligenceFormProps = {
  workspaceSlug: string;
  leadId: string;
  mode: "database" | "demo";
  summary: string;
  nextAction: string;
  tagsValue: string;
  tagSuggestions: string[];
};

function parseInitialTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

export function LeadIntelligenceForm({
  workspaceSlug,
  leadId,
  mode,
  summary,
  nextAction,
  tagsValue,
  tagSuggestions,
}: LeadIntelligenceFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(parseInitialTags(tagsValue));
  const [customTag, setCustomTag] = useState("");

  function addTag(tag: string) {
    const normalized = tag.trim();

    if (!normalized) {
      return;
    }

    setSelectedTags((current) =>
      current.includes(normalized) ? current : [...current, normalized],
    );
  }

  function removeTag(tag: string) {
    setSelectedTags((current) => current.filter((entry) => entry !== tag));
  }

  function toggleSuggestion(tag: string) {
    if (selectedTags.includes(tag)) {
      removeTag(tag);
      return;
    }

    addTag(tag);
  }

  function addCustomTag(event?: MouseEvent<HTMLButtonElement>) {
    event?.preventDefault();
    addTag(customTag);
    setCustomTag("");
  }

  return (
    <form
      action={updateLeadIntelligenceAction}
      className="rounded-[1.5rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(240,253,250,0.92))] p-4 shadow-[0_18px_55px_rgba(148,163,184,0.14)]"
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="tags" value={selectedTags.join(", ")} />

      <p className="text-sm font-medium text-slate-950">Lead intelligence</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Adjust the next step and tags manually so the CRM reflects your actual sales judgment.
      </p>

      <div className="mt-4 grid gap-4">
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Summary</span>
          <textarea
            name="summary"
            required
            rows={4}
            defaultValue={summary}
            className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Concise AI summary of what this lead needs, what matters, and what changed..."
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Next action</span>
          <textarea
            name="nextAction"
            required
            rows={4}
            defaultValue={nextAction}
            className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
            placeholder="Send proposal, book discovery call, clarify scope, or close the loop..."
          />
        </label>

        <div className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Selected tags</span>
          <div className="flex flex-wrap gap-2 rounded-[1.2rem] border border-slate-200 bg-white px-3 py-3">
            {selectedTags.length > 0 ? (
              selectedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-900"
                >
                  {tag} x
                </button>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No tags selected yet. Add one from suggestions or create your own.
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Suggested tags</span>
          <div className="flex flex-wrap gap-2">
            {tagSuggestions.map((tag) => {
              const active = selectedTags.includes(tag);

              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleSuggestion(tag)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? "bg-[linear-gradient(135deg,#14b8a6,#0f766e)] !text-white shadow-[0_10px_24px_rgba(20,184,166,0.24)]"
                      : "border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
                  }`}
                >
                  {active ? "Added: " : ""}{tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-slate-700">
          <span className="font-medium">Other tag</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={customTag}
              onChange={(event) => setCustomTag(event.target.value)}
              type="text"
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:bg-teal-50/40"
              placeholder="Type a custom tag directly"
            />
            <button
              type="button"
              onClick={(event) => addCustomTag(event)}
              className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-900"
            >
              Add tag
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {mode === "database" ? "Saves manual next-step guidance and tag edits" : "Demo mode redirect only"}
        </span>
        <FormSubmitButton
          idleLabel="Save intelligence"
          pendingLabel="Saving intelligence..."
          className="rounded-full bg-[linear-gradient(135deg,#14b8a6,#0f766e)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(20,184,166,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(20,184,166,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    </form>
  );
}
