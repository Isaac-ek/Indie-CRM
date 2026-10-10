"use server";

import { revalidatePath } from "next/cache";
import {
  extractDataFromImage,
  executeImageWorkflow,
  getDeterministicFallbackExtraction,
  ImageExtractionResult,
  MAX_IMAGE_UPLOAD_BYTES,
  validateImageUpload,
} from "@/lib/image-processing";
import { logError, logInfo } from "@/lib/logger";
import { requireWorkspacePermission, getWorkspaceContext } from "@/lib/workspaces";

export type ImageProcessState = {
  success: boolean;
  message?: string;
  error?: string;
  leadId?: string;
  contactId?: string;
  score?: number;
  extraction?: ImageExtractionResult;
};

/**
 * Server action to process an uploaded image or sample preset
 * and execute the full CRM ingestion pipeline.
 */
export async function processImageUploadAction(
  prevState: ImageProcessState | null,
  formData: FormData
): Promise<ImageProcessState> {
  try {
    const workspaceSlug = formData.get("workspaceSlug") as string;
    if (!workspaceSlug) {
      return { success: false, error: "Missing workspace identifier." };
    }

    const workspace = await getWorkspaceContext(workspaceSlug);
    // RBAC: Requires leads:create capability
    requireWorkspacePermission(workspace, "leads:write");

    const presetKey = formData.get("presetKey") as string | null;
    const file = formData.get("imageFile") as File | null;

    let extraction: ImageExtractionResult;

    if (presetKey) {
      // Use predefined rich demo preset for instant testing
      let fileName = "luminary_business_card.jpg";
      if (presetKey === "whiteboard") {
        fileName = "q3_strategy_whiteboard.png";
      } else if (presetKey === "badge") {
        fileName = "health_tech_summit_badge.jpg";
      }

      extraction = getDeterministicFallbackExtraction(
        fileName,
        1024 * 340,
        presetKey === "whiteboard" ? "image/png" : "image/jpeg",
        `preset_hash_${presetKey}_${Date.now()}`
      );
    } else if (file && file.size > 0) {
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        return {
          success: false,
          error: "File exceeds the 10MB maximum upload limit.",
        };
      }

      const validation = validateImageUpload({
        size: file.size,
        type: file.type,
        name: file.name,
      });

      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid file format: ${validation.error}. Please upload JPEG, PNG, or WebP.`,
        };
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      extraction = await extractDataFromImage({
        buffer,
        fileName: file.name,
        mimeType: file.type,
      });
    } else {
      return {
        success: false,
        error: "Please select an image file or choose a preset demonstration.",
      };
    }

    // Execute the complete ingestion pipeline
    const workflowResult = await executeImageWorkflow({
      workspace,
      extraction,
      workflowRules: [], // Uses default workflow evaluator inside workflowResult
    });

    logInfo("Image processing workflow executed successfully", {
      workspaceSlug,
      leadId: workflowResult.leadId,
      score: workflowResult.score,
    });

    // Revalidate relevant pages so new leads appear instantly
    revalidatePath(`/w/${workspaceSlug}`);
    revalidatePath(`/w/${workspaceSlug}/leads`);
    revalidatePath(`/w/${workspaceSlug}/scanner`);

    return {
      success: true,
      message: `Successfully processed image and created lead: "${extraction.lead.title}"`,
      leadId: workflowResult.leadId,
      contactId: workflowResult.contactId,
      score: workflowResult.score,
      extraction,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to process image.";
    logError("processImageUploadAction error", err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
