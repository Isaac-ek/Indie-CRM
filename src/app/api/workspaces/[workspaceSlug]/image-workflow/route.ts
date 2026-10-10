import { NextRequest, NextResponse } from "next/server";
import {
  extractDataFromImage,
  executeImageWorkflow,
  getDeterministicFallbackExtraction,
  MAX_IMAGE_UPLOAD_BYTES,
  validateImageUpload,
} from "@/lib/image-processing";
import { logError, logInfo } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { getWorkspaceContext, requireWorkspacePermission } from "@/lib/workspaces";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workspaceSlug: string }> }
) {
  const { workspaceSlug } = await context.params;
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // Rate Limiting: AI_VECTOR tier (20 requests per minute)
  const rateLimitResult = await checkRateLimit(`image_workflow:${clientIp}`, "AI_VECTOR");
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded for AI vision processing.",
        retryAfter: rateLimitResult.resetSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.resetSeconds),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  }

  try {
    const workspace = await getWorkspaceContext(workspaceSlug);
    requireWorkspacePermission(workspace, "leads:write");

    const contentType = request.headers.get("content-type") || "";

    let buffer: Buffer | null = null;
    let fileName = "upload.jpg";
    let mimeType = "image/jpeg";
    let presetKey: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      presetKey = formData.get("presetKey") as string | null;
      const file = formData.get("file") as File | null;

      if (file && file.size > 0) {
        if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
          return NextResponse.json(
            { error: "Image file exceeds 10MB maximum limit." },
            { status: 400 }
          );
        }
        fileName = file.name;
        mimeType = file.type;
        buffer = Buffer.from(await file.arrayBuffer());
      }
    } else if (contentType.includes("application/json")) {
      const json = await request.json();
      presetKey = json.presetKey || null;

      if (json.base64) {
        buffer = Buffer.from(json.base64, "base64");
        fileName = json.fileName || "api_upload.png";
        mimeType = json.mimeType || "image/png";
      }
    }

    let extraction;
    if (presetKey) {
      let pFile = "luminary_business_card.jpg";
      if (presetKey === "whiteboard") pFile = "strategy_whiteboard.png";
      if (presetKey === "badge") pFile = "conference_badge.jpg";

      extraction = getDeterministicFallbackExtraction(
        pFile,
        1024 * 300,
        presetKey === "whiteboard" ? "image/png" : "image/jpeg",
        `preset_${presetKey}_api_${Date.now()}`
      );
    } else if (buffer && buffer.length > 0) {
      const validation = validateImageUpload(
        { size: buffer.length, type: mimeType, name: fileName },
        buffer
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Invalid image: ${validation.error}` },
          { status: 400 }
        );
      }

      extraction = await extractDataFromImage({
        buffer,
        fileName,
        mimeType,
      });
    } else {
      return NextResponse.json(
        { error: "No image file, base64 payload, or presetKey provided." },
        { status: 400 }
      );
    }

    const workflowResult = await executeImageWorkflow({
      workspace,
      extraction,
    });

    logInfo("Image workflow API route completed successfully", {
      workspaceSlug,
      leadId: workflowResult.leadId,
      score: workflowResult.score,
    });

    return NextResponse.json(
      {
        success: true,
        leadId: workflowResult.leadId,
        contactId: workflowResult.contactId,
        noteId: workflowResult.noteId,
        score: workflowResult.score,
        extraction,
        triggeredActions: workflowResult.triggeredActions,
      },
      {
        status: 201,
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        },
      }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error";
    logError("API image-workflow error", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
