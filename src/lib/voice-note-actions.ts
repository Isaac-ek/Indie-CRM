"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { AIGenerationType, AuditLogAction } from "@/generated/prisma/client";
import { upsertNoteEmbedding } from "@/lib/ai";
import { createAuditLog } from "@/lib/audit";
import { getPrismaClient } from "@/lib/prisma";
import { requiredTrimmedString } from "@/lib/validation";
import { canContributeToLead, getWorkspaceContext } from "@/lib/workspaces";

import { transcribeAudioBuffer, validateAudioUpload } from "@/lib/transcription";

/**
 * Server action to process voice note audio uploads, transcribe audio, and save as lead note.
 */
export async function createVoiceNoteAction(formData: FormData) {
  const workspaceSlug = requiredTrimmedString(formData, "workspaceSlug", { maxLength: 80 });
  const leadId = requiredTrimmedString(formData, "leadId", { maxLength: 64 });
  const workspace = await getWorkspaceContext(workspaceSlug);

  if (workspace.publicDemo || !canContributeToLead(workspace.membershipRole)) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?permissionError=read_only`);
  }

  if (workspace.mode !== "database" || !workspace.id) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?voiceError=database_required`);
  }
  const lead = await getPrismaClient().lead.findFirst({
    where: { id: leadId, tenantId: workspace.id },
    select: { id: true },
  });
  if (!lead) notFound();

  const audioFile = formData.get("audioFile") as File | null;
  if (!audioFile) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?voiceError=missing_file`);
  }
  const validation = validateAudioUpload(audioFile);
  if (!validation.valid) {
    redirect(`/w/${workspaceSlug}/leads/${leadId}?voiceError=${validation.error}`);
  }

  const arrayBuffer = await audioFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const transcription = await transcribeAudioBuffer(buffer, audioFile.name, audioFile.type);

  if (workspace.mode === "database" && workspace.id) {
    const prisma = getPrismaClient();

    const note = await prisma.note.create({
      data: {
        tenantId: workspace.id,
        leadId,
        authorId: workspace.currentUser.id,
        content: `🎙️ Voice Note (${audioFile.name}):\n"${transcription.text}"`,
      },
    });

    // Store AI provenance
    await prisma.aIGeneration.create({
      data: {
        tenantId: workspace.id,
        leadId,
        requestedById: workspace.currentUser.id,
        type: AIGenerationType.SUMMARY,
        model: transcription.model,
        promptVersion: "v1.0-voice-transcription",
        inputSummary: `Voice note audio file (${audioFile.name}, ${audioFile.size} bytes)`,
        outputText: transcription.text,
        metadata: {
          fileName: audioFile.name,
          fileSize: audioFile.size,
          provider: transcription.provider,
        },
      },
    });

    // Index note vector embedding
    await upsertNoteEmbedding({
      tenantId: workspace.id,
      noteId: note.id,
      content: note.content,
    });

    // Create Audit Log
    await createAuditLog({
      tenantId: workspace.id,
      actorUserId: workspace.currentUser.id,
      action: AuditLogAction.NOTE_CREATED,
      targetType: "note",
      targetId: note.id,
      summary: `Transcribed and saved voice note for lead [${leadId}]`,
    });
  }

  revalidatePath(`/w/${workspaceSlug}`);
  revalidatePath(`/w/${workspaceSlug}/leads/${leadId}`);
  redirect(`/w/${workspaceSlug}/leads/${leadId}?voiceNoteSaved=1`);
}
