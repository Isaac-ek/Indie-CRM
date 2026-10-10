import { AppShell } from "@/components/app-shell";
import { FormSubmitButton } from "@/components/form-submit-button";
import { MembershipRole, Prisma, WebhookEventStatus, WorkspaceInviteStatus } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import {
  inviteWorkspaceMemberAction,
  revokeWorkspaceInviteAction,
  updateWorkspaceMemberRoleAction,
  backfillEmbeddingsAction,
  saveAIInstructionsAction,
  saveGmailConnectionAction,
  syncGmailAction,
  processWebhookQueueAction,
  testSlackWebhookAction,
  syncOutlookAction,
} from "@/lib/settings-actions";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/workspaces";
import { WorkflowBuilder } from "@/components/workflow-builder";

const settingsGroups = [
  {
    title: "Workspace",
    items: ["Tenant name", "Member roles", "Invite flow", "Audit history"],
  },
  {
    title: "AI",
    items: ["Model choice", "Tag schema", "Prompt instructions", "Generation logging"],
  },
  {
    title: "Integrations",
    items: ["Form webhooks", "Gmail sync", "Slack alerts", "API keys"],
  },
];

type PageProps = {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{
    embeddingsBackfilled?: string;
    webhookProcessed?: string;
    webhookFailed?: string;
    memberInvited?: string;
    memberUpdated?: string;
    memberError?: string;
    inviteRevoked?: string;
    gmailConnected?: string;
    gmailImported?: string;
    gmailSkipped?: string;
    gmailError?: string;
    aiInstructionsSaved?: string;
    slackTested?: string;
    slackError?: string;
    settingsError?: string;
  }>;
};

function membershipRoleLabel(role: MembershipRole | "OWNER") {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

async function safeSettingsQuery<T>(query: () => Promise<T>, fallback: T) {
  try {
    return { value: await query(), failed: false as const };
  } catch {
    return { value: fallback, failed: true as const };
  }
}

export default async function SettingsPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params;
  const query = await searchParams;
  const workspace = await getWorkspaceContext(workspaceSlug);
  const formWebhookPath = `/api/webhooks/forms/${workspace.slug}`;
  const processorPath = `/api/internal/process-webhooks?workspaceSlug=${workspace.slug}&limit=20`;
  const cronPath = "/api/cron/process-webhooks";
  const prisma = workspace.mode === "database" ? getPrismaClient() : null;
  const workspaceId = workspace.mode === "database" ? workspace.id : null;
  const tenantSettingsQuery =
    workspace.mode === "database" && workspaceId
      ? await safeSettingsQuery(
          () =>
            prisma!.tenant.findUnique({
              where: { id: workspaceId },
              select: { aiInstructions: true },
            }),
          null,
        )
      : { value: null, failed: false as const };
  const tenantSettings = tenantSettingsQuery.value;
  const canManageMembers = canManageWorkspace(workspace.membershipRole);

  const memberships =
    workspace.mode === "database" && workspaceId
      ? (
          await safeSettingsQuery(
            () =>
              prisma!.membership.findMany({
                where: { tenantId: workspaceId },
                orderBy: [{ role: "asc" }, { createdAt: "asc" }],
                select: {
                  id: true,
                  role: true,
                  createdAt: true,
                  user: { select: { id: true, email: true, name: true } },
                },
              }),
            [],
          )
        ).value
      : [];

  const pendingInvites =
    workspace.mode === "database" && workspaceId
      ? (
          await safeSettingsQuery(
            () =>
              prisma!.workspaceInvite.findMany({
                where: { tenantId: workspaceId, status: WorkspaceInviteStatus.PENDING },
                orderBy: { createdAt: "desc" },
                select: { id: true, token: true, email: true, role: true, createdAt: true },
              }),
            [],
          )
        ).value
      : [];

  const gmailConnections =
    workspace.mode === "database" && workspaceId
      ? (
          await safeSettingsQuery(
            () =>
              prisma!.mailboxConnection.findMany({
                where: { tenantId: workspaceId },
                orderBy: { updatedAt: "desc" },
                select: {
                  id: true,
                  provider: true,
                  email: true,
                  lastSyncAttemptAt: true,
                  lastSyncedAt: true,
                  consecutiveFailures: true,
                  lastError: true,
                },
              }),
            [],
          )
        ).value
      : [];

  const webhookEvents =
    workspace.mode === "database" && workspaceId
      ? (
          await safeSettingsQuery(
            () =>
              prisma!.webhookEvent.findMany({
                where: { tenantId: workspaceId },
                orderBy: { receivedAt: "desc" },
                take: 10,
                select: {
                  id: true,
                  source: true,
                  eventType: true,
                  status: true,
                  retryCount: true,
                  maxRetries: true,
                  receivedAt: true,
                  nextRetryAt: true,
                  errorMessage: true,
                },
              }),
            [],
          )
        ).value
      : [];

  const operationalEvents =
    workspace.mode === "database" && workspaceId
      ? (
          await safeSettingsQuery(
            () =>
              prisma!.operationalEvent.findMany({
                where: { tenantId: workspaceId },
                orderBy: { createdAt: "desc" },
                take: 10,
                select: {
                  id: true,
                  source: true,
                  level: true,
                  message: true,
                  createdAt: true,
                },
              }),
            [],
          )
        ).value
      : [];

  const webhookCounts = {
    pending: webhookEvents.filter((e) => e.status === WebhookEventStatus.PENDING).length,
    processed: webhookEvents.filter((e) => e.status === WebhookEventStatus.PROCESSED).length,
    failed: webhookEvents.filter((e) => e.status === WebhookEventStatus.FAILED).length,
  };

  const operationalCounts = {
    ai: operationalEvents.filter((e) => e.source.startsWith("ai.")).length,
    webhooks: operationalEvents.filter((e) => e.source.startsWith("webhook.")).length,
    sync: operationalEvents.filter((e) => e.source.startsWith("gmail.")).length,
  };

  return (
    <AppShell
      currentPath="/settings"
      workspace={workspace}
      eyebrow="Workspace Control"
      title="Settings & Operational Integrations"
      description="Manage workspace team members, automated workflow rules, custom AI prompts, and integration webhooks."
    >
      <div className="flex flex-col gap-6 text-slate-900">
        {/* Notifications */}
        {query.memberInvited && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950 shadow-sm">
            {query.memberInvited === "joined"
              ? "Existing user added to workspace."
              : "Invitation link generated successfully."}
          </div>
        )}
        {query.memberUpdated && (
          <div className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-950 shadow-sm">
            Membership role updated.
          </div>
        )}
        {query.inviteRevoked && (
          <div className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-900 shadow-sm">
            Pending invite revoked.
          </div>
        )}
        {query.memberError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-950 shadow-sm">
            {query.memberError === "permissions"
              ? "Permission Denied: You do not have rights to modify workspace members or roles."
              : query.memberError === "already_member"
                ? "That email already belongs to a workspace member."
                : query.memberError === "last_owner"
                  ? "Cannot demote or remove the last remaining owner."
                  : "Member update failed."}
          </div>
        )}
        {query.slackTested && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950 shadow-sm">
            🔥 Slack webhook test alert dispatched successfully! Check your Slack channel.
          </div>
        )}
        {query.slackError && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-950 shadow-sm">
            Slack Webhook Error: {query.slackError}
          </div>
        )}
        {!canManageMembers && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950 shadow-sm">
            Read-Only Mode: Only workspace owners and admins can edit settings, instructions, or members.
          </div>
        )}

        {/* Header Control Plane Hero */}
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Workspace Control Plane
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Policies & Automation Rules
              </h1>
              <p className="mt-2 max-w-3xl text-sm font-medium text-slate-300 leading-relaxed">
                Central configuration for workflow rules, tenant team access, AI system prompts, and webhooks.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Members</p>
              <p className="mt-1 text-2xl font-bold text-white">{memberships.length}</p>
              <p className="text-xs text-slate-400">{pendingInvites.length} pending invites</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Webhooks</p>
              <p className="mt-1 text-2xl font-bold text-teal-300">{webhookCounts.pending}</p>
              <p className="text-xs text-slate-400">Pending events</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Observability</p>
              <p className="mt-1 text-2xl font-bold text-amber-300">{operationalEvents.length}</p>
              <p className="text-xs text-slate-400">Log events</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-800/80 p-3.5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gmail</p>
              <p className="mt-1 text-2xl font-bold text-white">{gmailConnections.length}</p>
              <p className="text-xs text-slate-400">Connected inboxes</p>
            </div>
          </div>
        </header>

        {/* Section 1: Visual Workflow Rule Builder */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <WorkflowBuilder workspaceSlug={workspace.slug} />
        </section>

        {/* Section 2: Team Members & Role Management */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Team Access
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Workspace Members & Role Hierarchy
              </h3>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            {/* Invite Form */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-base font-bold text-slate-900">Invite New Teammate</h4>
              <p className="mt-1 text-xs text-slate-600">
                Assign a role (Member, Admin, Owner) and send a workspace invitation.
              </p>
              {canManageMembers && workspace.mode === "database" ? (
                <form action={inviteWorkspaceMemberAction} className="mt-4 space-y-3">
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <div>
                    <label className="block text-xs font-bold text-slate-800">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="teammate@company.com"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800">Role</label>
                    <select
                      name="role"
                      defaultValue={MembershipRole.MEMBER}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-teal-600"
                    >
                      <option value={MembershipRole.MEMBER}>Member</option>
                      <option value={MembershipRole.ADMIN}>Admin</option>
                      <option value={MembershipRole.OWNER}>Owner</option>
                    </select>
                  </div>
                  <FormSubmitButton
                    idleLabel="Send Invite"
                    pendingLabel="Sending..."
                    className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-teal-500 transition"
                  />
                </form>
              ) : (
                <p className="mt-3 text-xs text-slate-500">Read-only view for members.</p>
              )}
            </div>

            {/* Current Roster */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-base font-bold text-slate-900">Active Member Roster</h4>
              <div className="mt-4 space-y-3">
                {memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {membership.user.name ?? membership.user.email}
                      </p>
                      <p className="text-xs text-slate-500">{membership.user.email}</p>
                    </div>
                    {canManageMembers && workspace.mode === "database" ? (
                      <form action={updateWorkspaceMemberRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <select
                          name="role"
                          defaultValue={membership.role}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-900"
                        >
                          <option value={MembershipRole.MEMBER}>Member</option>
                          <option value={MembershipRole.ADMIN}>Admin</option>
                          <option value={MembershipRole.OWNER}>Owner</option>
                        </select>
                        <FormSubmitButton
                          idleLabel="Update"
                          pendingLabel="Saving..."
                          className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white"
                        />
                      </form>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800">
                        {membershipRoleLabel(membership.role)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Invites */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h4 className="text-base font-bold text-slate-900">Pending Invitations</h4>
            <div className="mt-3 space-y-3">
              {pendingInvites.length > 0 ? (
                pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{invite.email}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        Role: {membershipRoleLabel(invite.role)}
                      </p>
                      <code className="mt-1 block text-xs text-teal-800 font-mono">
                        {`/invite/${invite.token}`}
                      </code>
                    </div>
                    {canManageMembers && (
                      <form action={revokeWorkspaceInviteAction}>
                        <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <FormSubmitButton
                          idleLabel="Revoke"
                          pendingLabel="Revoking..."
                          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                        />
                      </form>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs font-medium text-slate-500">No pending invites.</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: AI Prompt Instructions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">AI Prompt Configuration</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Custom Workspace AI Instructions</h3>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Set guidance included in all AI summaries, reply drafts, follow-ups, and search answers.
            </p>
          </div>

          <form action={saveAIInstructionsAction} className="mt-5 space-y-4">
            <input type="hidden" name="workspaceSlug" value={workspace.slug} />
            <textarea
              name="aiInstructions"
              rows={5}
              defaultValue={tenantSettings?.aiInstructions ?? ""}
              className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-900 outline-none focus:border-teal-600"
              placeholder="e.g. Keep summaries concise. Prioritize budget signals. Prefer direct and helpful reply drafts..."
            />
            <div className="flex justify-end">
              <FormSubmitButton
                idleLabel="Save AI Instructions"
                pendingLabel="Saving..."
                className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-teal-500 transition"
              />
            </div>
          </form>
        </section>

        {/* Section 4: Webhook Integration & Operations */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Webhooks & Operations</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Form Webhook Queue & Vector Backfill</h3>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Form Webhook Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Public Webhook POST URL</p>
              <code className="mt-2 block rounded-lg bg-slate-900 p-3 text-xs text-teal-300 font-mono overflow-x-auto">
                {formWebhookPath}
              </code>

              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-xs font-bold text-slate-700">Embedding Backfill</span>
                <form action={backfillEmbeddingsAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <FormSubmitButton
                    idleLabel="Run Backfill"
                    pendingLabel="Backfilling..."
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                  />
                </form>
              </div>
            </div>

            {/* Webhook Queue Controls */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Queue Processing</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">Process Webhook Queue</p>
                </div>
                <form action={processWebhookQueueAction}>
                  <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                  <FormSubmitButton
                    idleLabel="Process Queue"
                    pendingLabel="Processing..."
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-teal-500"
                  />
                </form>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-amber-100 p-2 font-bold text-amber-900">
                  {webhookCounts.pending} Pending
                </div>
                <div className="rounded-lg bg-emerald-100 p-2 font-bold text-emerald-900">
                  {webhookCounts.processed} Processed
                </div>
                <div className="rounded-lg bg-rose-100 p-2 font-bold text-rose-900">
                  {webhookCounts.failed} Failed
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Slack Alert Webhook */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Slack Integration</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Hot Lead Webhook Notifications</h3>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Receive instant Slack channel alerts when new high-priority or high-scoring leads are detected.
            </p>
          </div>

          <form action={testSlackWebhookAction} className="mt-5 space-y-4">
            <input type="hidden" name="workspaceSlug" value={workspace.slug} />
            <div>
              <label className="block text-xs font-bold text-slate-800">Slack Incoming Webhook URL</label>
              <input
                type="url"
                name="slackWebhookUrl"
                required
                placeholder="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500">
                Dispatches a rich Slack Block Kit card featuring lead title, score, stage, contact email, and deep-link.
              </p>
              <FormSubmitButton
                idleLabel="Send Test Slack Alert"
                pendingLabel="Sending Alert..."
                className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-teal-500 transition"
              />
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
