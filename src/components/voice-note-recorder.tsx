"use client";

import { useState } from "react";
import { createVoiceNoteAction } from "@/lib/transcription";
import { FormSubmitButton } from "@/components/form-submit-button";

type VoiceNoteRecorderProps = {
  workspaceSlug: string;
  leadId: string;
  canEdit: boolean;
};

export function VoiceNoteRecorder({ workspaceSlug, leadId, canEdit }: VoiceNoteRecorderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!canEdit) return null;

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>🎙️</span> Voice Note Transcription
          </h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Upload an audio recording (.mp3, .m4a, .wav, .webm) to transcribe into searchable lead notes.
          </p>
        </div>
      </div>

      <form action={createVoiceNoteAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
        <input type="hidden" name="leadId" value={leadId} />

        <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-teal-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-teal-500 transition">
          <input
            type="file"
            name="audioFile"
            accept="audio/*,.mp3,.wav,.m4a,.webm"
            required
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          {selectedFile ? (
            <span className="text-teal-800 font-bold">🎵 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          ) : (
            <span className="text-slate-500">Click to select audio file (.mp3, .wav, .m4a, .webm)...</span>
          )}
        </label>

        <FormSubmitButton
          idleLabel="Transcribe & Save Note"
          pendingLabel="Transcribing..."
          className="rounded-xl bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow hover:bg-teal-900 transition shrink-0"
        />
      </form>
    </div>
  );
}
