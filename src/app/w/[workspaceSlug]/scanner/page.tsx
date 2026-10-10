import { AppShell } from "@/components/app-shell";
import { ImageScannerView } from "@/components/image-scanner-view";
import { getWorkspaceContext } from "@/lib/workspaces";

type ScannerPageProps = {
  params: Promise<{ workspaceSlug: string }>;
};

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceContext(workspaceSlug);

  return (
    <AppShell
      currentPath="/scanner"
      workspace={workspace}
      eyebrow="Vision AI Workflow"
      title="End-to-End Image Processing Pipeline"
      description="Automate contact extraction, lead intelligence, vector embeddings, and workflow triggers from images."
    >
      <ImageScannerView workspaceSlug={workspaceSlug} />
    </AppShell>
  );
}
