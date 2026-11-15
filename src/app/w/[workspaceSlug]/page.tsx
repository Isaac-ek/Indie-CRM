import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspaces";

export default async function WorkspaceHome({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await getWorkspaceContext(workspaceSlug);
  redirect(`/w/${workspace.slug}/leads?layout=kanban`);
}
