"use client";

import Link from "next/link";
import React, { useState, useTransition } from "react";
import { ImageExtractionResult } from "@/lib/image-processing";
import { processImageUploadAction } from "@/lib/image-actions";

type ImageScannerViewProps = {
  workspaceSlug: string;
};

type ProcessingStep = {
  id: string;
  label: string;
  status: "idle" | "running" | "completed";
};

const INITIAL_STEPS: ProcessingStep[] = [
  { id: "validate", label: "File Validation & SHA-256 Checksum", status: "idle" },
  { id: "ocr", label: "OpenAI Vision OCR & Semantic Parsing", status: "idle" },
  { id: "scoring", label: "Predictive Lead Scoring & Priority Tagging", status: "idle" },
  { id: "embeddings", label: "Vector Embedding Indexing (pgvector)", status: "idle" },
  { id: "workflow", label: "Workflow Automation & Slack Alerts", status: "idle" },
];

export function ImageScannerView({ workspaceSlug }: ImageScannerViewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [steps, setSteps] = useState<ProcessingStep[]>(INITIAL_STEPS);
  const [result, setResult] = useState<{
    leadId?: string;
    contactId?: string;
    score?: number;
    extraction?: ImageExtractionResult;
    message?: string;
    error?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setActivePreset(null);
      setResult(null);
      const url = URL.createObjectURL(file);
      setFilePreview(url);
    }
  };

  const handlePresetSelect = (presetKey: string) => {
    setActivePreset(presetKey);
    setSelectedFile(null);
    setResult(null);
    if (presetKey === "card") {
      setFilePreview("/presets/business_card_preview.png");
    } else if (presetKey === "whiteboard") {
      setFilePreview("/presets/whiteboard_preview.png");
    } else {
      setFilePreview("/presets/badge_preview.png");
    }
  };

  const handleProcess = () => {
    if (!selectedFile && !activePreset) return;

    setResult(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "running" })));

    startTransition(async () => {
      const formData = new FormData();
      formData.set("workspaceSlug", workspaceSlug);

      if (activePreset) {
        formData.set("presetKey", activePreset);
      } else if (selectedFile) {
        formData.set("imageFile", selectedFile);
      }

      const res = await processImageUploadAction(null, formData);

      if (res.success && res.extraction) {
        setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "completed" })));
        setResult({
          leadId: res.leadId,
          contactId: res.contactId,
          score: res.score,
          extraction: res.extraction,
          message: res.message,
        });
      } else {
        setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "idle" })));
        setResult({
          error: res.error || "Failed to process image.",
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.85))] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold tracking-wider text-teal-300 uppercase">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              Vision AI Pipeline
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              End-to-End Image Processing & OCR Intake
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Transform business cards, meeting whiteboards, conference badges, and intake forms into structured CRM leads, complete with predictive scoring, vector memory, and automated workflow triggers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">Supported: JPEG, PNG, WebP (Max 10MB)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Upload & Demo Presets */}
        <div className="space-y-6 lg:col-span-5">
          {/* Preset Buttons */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-slate-200">
              ⚡ Instant Demo Presets
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Test the extraction pipeline instantly without uploading your own image.
            </p>

            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={() => handlePresetSelect("card")}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  activePreset === "card"
                    ? "border-teal-400 bg-teal-500/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
                  🪪
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Business Card Scan</div>
                  <div className="text-xs text-slate-400">
                    Sarah Jenkins (VP Strategy, Luminary Creative Studio)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect("whiteboard")}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  activePreset === "whiteboard"
                    ? "border-sky-400 bg-sky-500/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                  📋
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Strategy Whiteboard</div>
                  <div className="text-xs text-slate-400">
                    HyperGrowth Labs Q3 Executive Roadmap & Scope ($18.5k)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect("badge")}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  activePreset === "badge"
                    ? "border-indigo-400 bg-indigo-500/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                  🏷️
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Conference Attendee Badge</div>
                  <div className="text-xs text-slate-400">
                    Dr. Marcus Vance (Health-Tech Summit 2026, Urgent Priority)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-slate-200">
              📁 Upload Custom Image
            </h3>

            <div className="mt-3">
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 text-center transition hover:border-teal-400/50 hover:bg-white/[0.04] cursor-pointer"
              >
                <svg
                  className="h-10 w-10 text-slate-400 mb-3"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-medium text-slate-300">
                  {selectedFile ? selectedFile.name : "Click to select or drag and drop image"}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  PNG, JPG, WebP up to 10MB
                </span>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            {/* Artifact Preview */}
            {(selectedFile || activePreset) && (
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                  <span className="font-semibold uppercase tracking-wider text-teal-300">
                    {activePreset ? `Preset Selected: ${activePreset.toUpperCase()}` : "Uploaded File"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setActivePreset(null);
                      setFilePreview(null);
                    }}
                    className="text-slate-400 hover:text-white transition text-[11px]"
                  >
                    ✕ Clear
                  </button>
                </div>

                {selectedFile && filePreview ? (
                  <div className="flex justify-center p-2 bg-white/[0.02] rounded-lg border border-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={filePreview}
                      alt="Uploaded preview"
                      className="max-h-40 rounded-lg object-contain border border-white/10 shadow-md"
                    />
                  </div>
                ) : activePreset === "card" ? (
                  <div className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-slate-900 via-amber-950/30 to-slate-900 p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300">
                        Luminary Creative Studio
                      </span>
                      <span className="text-[10px] text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                        🪪 Business Card
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-white">Sarah Jenkins</div>
                    <div className="text-xs text-slate-300">VP of Brand Strategy</div>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-mono">
                      <span>sarah.jenkins@luminarybrand.test</span>
                      <span>+1 (555) 839-2041</span>
                    </div>
                  </div>
                ) : activePreset === "whiteboard" ? (
                  <div className="rounded-lg border border-sky-500/30 bg-gradient-to-br from-slate-900 via-sky-950/30 to-slate-900 p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-sky-300">
                        HyperGrowth Labs
                      </span>
                      <span className="text-[10px] text-sky-200 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30">
                        📋 Executive Whiteboard
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-200">Q3 Roadmap & CRM Ingestion</div>
                    <div className="mt-1.5 space-y-1 text-[11px] text-slate-300 font-mono">
                      <div>• Budget: $18,500 target</div>
                      <div>• Contact: Alex Rivera (Head of Product)</div>
                    </div>
                  </div>
                ) : activePreset === "badge" ? (
                  <div className="rounded-lg border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 p-4 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300">
                        Health-Tech Summit 2026
                      </span>
                      <span className="text-[10px] text-indigo-200 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/30">
                        🏷️ Attendee Lanyard
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-white">Dr. Marcus Vance, MD</div>
                    <div className="text-xs text-slate-300">Founder & CMO • BioHealth Innovations</div>
                    <div className="mt-2 text-[11px] text-indigo-300 font-mono">
                      Target: Enterprise Clinical Intake & HIPAA Compliance
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Run Pipeline Action Button */}
            <button
              type="button"
              disabled={isPending || (!selectedFile && !activePreset)}
              onClick={handleProcess}
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:from-teal-400 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Running Vision AI Pipeline...
                </>
              ) : (
                <>
                  <span>🚀 Execute End-to-End Pipeline</span>
                </>
              )}
            </button>
          </div>

          {/* Pipeline Stage Indicators */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-xl">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pipeline Execution Stages
            </h4>
            <div className="mt-3 space-y-2.5">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3 text-xs">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      s.status === "completed"
                        ? "bg-teal-500/20 text-teal-300 border border-teal-400/40"
                        : s.status === "running"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse"
                        : "bg-white/5 text-slate-500 border border-white/10"
                    }`}
                  >
                    {s.status === "completed" ? "✓" : idx + 1}
                  </div>
                  <span
                    className={
                      s.status === "completed"
                        ? "text-slate-200 font-medium"
                        : s.status === "running"
                        ? "text-amber-300 font-medium"
                        : "text-slate-500"
                    }
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Ingestion Results & CRM Preview */}
        <div className="space-y-6 lg:col-span-7">
          {result?.error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">
              ❌ {result.error}
            </div>
          )}

          {result?.extraction ? (
            <div className="space-y-6 animate-fadeIn">
              {/* Success Notification Banner */}
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-5 text-sm text-teal-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold">Pipeline Successful:</span> Ingested into workspace database with vector embeddings and audit log!
                </div>
                {result.leadId && (
                  <Link
                    href={`/w/${workspaceSlug}/leads/${result.leadId}`}
                    className="rounded-lg bg-teal-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-teal-400 shrink-0"
                  >
                    View Lead →
                  </Link>
                )}
              </div>

              {/* Extracted Contact & Lead Overview */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-teal-400">
                      {result.extraction.classification.imageType.replace("_", " ")}
                    </span>
                    <h3 className="mt-1 text-xl font-bold text-white">
                      {result.extraction.lead.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border border-teal-400/30 bg-teal-400/10 px-3 py-1.5 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-teal-300">
                        Lead Score
                      </div>
                      <div className="text-lg font-bold text-teal-200">
                        {result.score ?? 85}/100
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Priority
                      </div>
                      <div className="text-sm font-semibold text-amber-300">
                        {result.extraction.lead.priority}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Card Details */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="text-xs text-slate-400">Contact Person</div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {result.extraction.contact.name}
                    </div>
                    {result.extraction.contact.jobTitle && (
                      <div className="text-xs text-slate-300">
                        {result.extraction.contact.jobTitle}
                      </div>
                    )}
                    {result.extraction.contact.company && (
                      <div className="text-xs text-teal-300 font-medium mt-0.5">
                        {result.extraction.contact.company}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-1">
                    <div className="text-xs text-slate-400">Reachability</div>
                    <div className="text-xs text-slate-200 font-mono">
                      ✉️ {result.extraction.contact.email}
                    </div>
                    {result.extraction.contact.phone && (
                      <div className="text-xs text-slate-300">
                        📞 {result.extraction.contact.phone}
                      </div>
                    )}
                    {result.extraction.contact.website && (
                      <div className="text-xs text-slate-300 truncate">
                        🌐 {result.extraction.contact.website}
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead Intelligence Summary */}
                <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="text-xs font-medium text-slate-400">
                    Lead Intelligence Summary
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    {result.extraction.lead.summary}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {result.extraction.lead.suggestedTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                    {result.extraction.lead.estimatedValue && (
                      <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                        Est. Value: {result.extraction.lead.estimatedValue}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recommended Next Action */}
                <div className="mt-4 rounded-xl border border-teal-400/20 bg-teal-400/[0.05] p-4">
                  <div className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
                    Recommended Next Action
                  </div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {result.extraction.lead.nextAction}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Suggested Follow-Up Window: within {result.extraction.lead.followUpDays} days
                  </div>
                </div>

                {/* Raw OCR Text Accordion */}
                <div className="mt-5 border-t border-white/10 pt-4">
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white">
                      ▶ View Raw OCR Transcription
                    </summary>
                    <pre className="mt-3 rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {result.extraction.classification.rawOcrText}
                    </pre>
                  </details>
                </div>

                {/* Technical Provenance Card */}
                <div className="mt-4 border-t border-white/10 pt-4 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                  <span>Engine: {result.extraction.metadata.provider} ({result.extraction.metadata.model})</span>
                  <span className="font-mono">SHA-256: {result.extraction.metadata.checksum.slice(0, 16)}...</span>
                  <span>Confidence: {Math.round(result.extraction.classification.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center backdrop-blur-xl min-h-[420px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                🔍
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">
                No Scanned Leads Processed Yet
              </h3>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">
                Choose one of the demo presets on the left or upload an image file to trigger the Vision AI OCR pipeline and watch the extraction run.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
