import { NextRequest, NextResponse } from "next/server";
import { generateWorkspaceLeadsCsv } from "@/lib/analytics-queries";
import { getWorkspaceContext, requireWorkspacePermission } from "@/lib/workspaces";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const { workspaceSlug } = await params;
    const workspace = await getWorkspaceContext(workspaceSlug);

    // Require read access to export leads
    requireWorkspacePermission(workspace, "leads:read");

    const csvContent = await generateWorkspaceLeadsCsv(workspaceSlug);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="indie-crm-${workspaceSlug}-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to export report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
