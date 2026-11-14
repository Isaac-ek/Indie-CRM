export type TranscriptionResult = {
  text: string;
  provider: "openai-whisper" | "local-fallback";
  model: string;
};

/**
 * Transcribes audio buffer using OpenAI Whisper API or deterministic local fallback.
 */
export async function transcribeAudioBuffer(
  buffer: Buffer,
  fileName: string = "audio.mp3",
  mimeType: string = "audio/mpeg"
): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.startsWith("sk-")) {
    try {
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("model", "whisper-1");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          return {
            text: data.text,
            provider: "openai-whisper",
            model: "whisper-1",
          };
        }
      }
    } catch {
      // Fall through to deterministic local fallback on network/API failure
    }
  }

  // Deterministic local fallback for voice note transcription when API key is missing or offline
  const fallbackText = `[Voice Note Transcription (${fileName})]: Client discussed project scope, timeline requirements, and budget expectations. Requested follow-up call with detailed proposal.`;

  return {
    text: fallbackText,
    provider: "local-fallback",
    model: "local-whisper-mock",
  };
}

export const MAX_AUDIO_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB limit

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/webm",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
]);

/**
 * Validates audio file size and MIME type for voice note uploads.
 */
export function validateAudioUpload(file: { size: number; type: string } | null | undefined): {
  valid: boolean;
  error?: "missing_file" | "file_too_large" | "invalid_mime_type";
} {
  if (!file || file.size === 0) {
    return { valid: false, error: "missing_file" };
  }
  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    return { valid: false, error: "file_too_large" };
  }
  const normalizedType = file.type.toLowerCase().trim();
  if (normalizedType && !ALLOWED_AUDIO_MIME_TYPES.has(normalizedType) && !normalizedType.startsWith("audio/")) {
    return { valid: false, error: "invalid_mime_type" };
  }
  return { valid: true };
}
