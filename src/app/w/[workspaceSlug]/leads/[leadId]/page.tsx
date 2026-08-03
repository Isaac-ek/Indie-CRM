import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LeadDetailLayout } from "@/components/lead-detail-layout";
import { LeadActivityTimeline } from "@/components/lead-activity-timeline";
import { LeadIntelligenceForm } from "@/components/lead-intelligence-form";
import { LeadNoteForm } from "@/components/lead-note-form";
import { LeadProfileForm } from "@/components/lead-profile-form";
import { LeadWorkflowForm } from "@/components/lead-workflow-form";
import { ReplyComposerForm } from "@/components/reply-composer-form";
import { ReplyDraftForm } from "@/components/reply-draft-form";
import {
  archiveLeadAction,
  deleteLeadAction,
  generateFollowUpRecommendationAction,
} from "@/lib/lead-actions";
import { getLeadDetail, hasDistinctSummary } from "@/lib/data";
import { canManageLeadRecords, getWorkspaceContext } from "@/lib/workspaces";

type PageProps = {
  params: Promise<{ workspaceSlug: string; leadId: string }>;
  searchParams: Promise<{
    noteCreated?: string;
    draftCreated?: string;
    replySent?: string;
    workflowUpdated?: string;
    intelligenceUpdated?: string;
    profileUpdated?: string;
    followUpRecommended?: string;
    permissionError?: string;
    dangerError?: string;
  }>;
};

export default async function LeadDetailPage({ params, searchParams }: PageProps) {
  const { workspaceSlug, leadId } = await params;
  const query = await searchParams;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const canEditLeadRecords = canManageLeadRecords(workspace.membershipRole);
  const lead = await getLeadDetail(workspace.slug, leadId);

  if (!lead) {
    notFound();
  }

  const distinctSummary = hasDistinctSummary(lead.summary, lead.messages[0]?.content ?? "");

  return (
    <AppShell
      currentPath="/leads"
      workspace={workspace}
      eyebrow="Lead Record"
      title={lead.name}
      description="Categorized & structured lead workspace: view communication timeline, AI intelligence, internal team memory, and profile settings."
    >
      <LeadDetailLayout
        workspaceSlug={workspace.slug}
        workspaceMode={workspace.mode}
        canEditLeadRecords={canEditLeadRecords}
        lead={lead}
        hasDistinctSummary={distinctSummary}
        queryNotifications={query}
        components={{
          replyComposer: (
            <ReplyComposerForm
              workspaceSlug={workspace.slug}
              leadId={lead.id}
              mode={workspace.mode}
            />
          ),
          activityTimeline: (
            <LeadActivityTimeline
              leadName={lead.name}
              stage={lead.stage}
              followUp={lead.followUp}
              nextAction={lead.nextAction}
              messages={lead.messages}
              notes={lead.notes}
              aiOutputs={lead.aiOutputs}
            />
          ),
          leadProfileForm: (
            <LeadProfileForm
              workspaceSlug={workspace.slug}
              leadId={lead.id}
              mode={workspace.mode}
              title={lead.title}
              name={lead.name}
              email={lead.email}
              company={lead.company}
              phone={lead.phone}
              industry={lead.industry}
              website={lead.website}
              companyNotes={lead.companyNotes}
            />
          ),
          leadIntelligenceForm: (
            <LeadIntelligenceForm
              workspaceSlug={workspace.slug}
              leadId={lead.id}
              mode={workspace.mode}
              summary={lead.summary}
              nextAction={lead.nextAction}
              tagsValue={lead.tagsValue}
              tagSuggestions={lead.tagSuggestions}
            />
          ),
          leadWorkflowForm: (
            <LeadWorkflowForm
              workspaceSlug={workspace.slug}
              leadId={lead.id}
              mode={workspace.mode}
              stage={lead.stage}
              sourceValue={lead.sourceValue}
              priorityValue={lead.priorityValue}
              followUpDateValue={lead.followUpDateValue}
            />
          ),
          replyDraftForm: (
            <ReplyDraftForm
              workspaceSlug={workspace.slug}
              leadId={lead.id}
              mode={workspace.mode}
            />
          ),
          leadNoteForm: (
            <LeadNoteForm
              workspaceSlug={workspace.slug}
              leadId={lead.id}
              mode={workspace.mode}
            />
          ),
          followUpRecommendationAction: generateFollowUpRecommendationAction,
          archiveLeadAction: archiveLeadAction,
          deleteLeadAction: deleteLeadAction,
        }}
      />
    </AppShell>
  );
}
