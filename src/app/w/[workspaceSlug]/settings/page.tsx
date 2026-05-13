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
} from "@/lib/settings-actions";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/workspaces";

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
    settingsError?: string;
  }>;
};

function membershipRoleLabel(role: MembershipRole | "OWNER") {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

async function safeSettingsQuery<T>(query: () => Promise<T>, fallback: T) {
  try {
    return { value: await query(), failed: false as const };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return { value: fallback, failed: true as const };
    }

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
      ? await safeSettingsQuery(() => prisma!.tenant.findUnique({
          where: {
            id: workspaceId,
          },
          select: {
            aiInstructions: true,
          },
        }), null)
      : { value: null, failed: false as const };
  const tenantSettings = tenantSettingsQuery.value;
  const canManageMembers = canManageWorkspace(workspace.membershipRole);
  const memberships =
    workspace.mode === "database" && workspaceId
      ? (await safeSettingsQuery(() => prisma!.membership.findMany({
          where: {
            tenantId: workspaceId,
          },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            role: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        }), [])).value
      : [];
  const pendingInvites =
    workspace.mode === "database" && workspaceId
      ? (await safeSettingsQuery(() => prisma!.workspaceInvite.findMany({
          where: {
            tenantId: workspaceId,
            status: WorkspaceInviteStatus.PENDING,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            token: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }), [])).value
      : [];
  const gmailConnections =
    workspace.mode === "database" && workspaceId
      ? (await safeSettingsQuery(() => prisma!.mailboxConnection.findMany({
          where: {
            tenantId: workspaceId,
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            provider: true,
            email: true,
            lastSyncAttemptAt: true,
            lastSyncedAt: true,
            consecutiveFailures: true,
            lastError: true,
          },
        }), [])).value
      : [];
  const webhookEvents =
    workspace.mode === "database" && workspaceId
      ? (await safeSettingsQuery(() => prisma!.webhookEvent.findMany({
          where: {
            tenantId: workspaceId,
          },
          orderBy: {
            receivedAt: "desc",
          },
          take: 6,
          select: {
            id: true,
            source: true,
            eventType: true,
            status: true,
            retryCount: true,
            maxRetries: true,
            receivedAt: true,
            nextRetryAt: true,
            processedAt: true,
            errorMessage: true,
          },
        }), [])).value
      : [];
  const operationalEvents =
    workspace.mode === "database" && workspaceId
      ? (await safeSettingsQuery(() => prisma!.operationalEvent.findMany({
          where: {
            tenantId: workspaceId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 8,
          select: {
            id: true,
            source: true,
            level: true,
            message: true,
            createdAt: true,
          },
        }), [])).value
      : [];
  const webhookCounts = {
    pending: webhookEvents.filter((event) => event.status === WebhookEventStatus.PENDING).length,
    processed: webhookEvents.filter((event) => event.status === WebhookEventStatus.PROCESSED).length,
    failed: webhookEvents.filter((event) => event.status === WebhookEventStatus.FAILED).length,
  };
  const operationalCounts = {
    ai: operationalEvents.filter((event) => event.source.startsWith("ai.")).length,
    webhooks: operationalEvents.filter((event) => event.source.startsWith("webhook.")).length,
    sync: operationalEvents.filter((event) => event.source.startsWith("gmail.")).length,
  };

  return (
    <AppShell
      currentPath="/settings"
      workspace={workspace}
      eyebrow="Settings"
      title="Control the rules behind the automation"
      description="This section will eventually hold workspace policies, custom AI instructions, and integration controls. It matters because strong product behavior depends on clear boundaries, not just model output."
    >
      {query.memberInvited ? (
        <div className="mb-6 rounded-[1.5rem] border border-emerald-200 bg-[linear-gradient(135deg,rgba(220,252,231,0.95),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-emerald-950 shadow-[0_12px_40px_rgba(74,222,128,0.14)]">
          {query.memberInvited === "joined"
            ? "Existing user added to the workspace successfully."
            : "Invitation created. Share the invite link below so the teammate can accept it."}
        </div>
      ) : null}

      {query.memberUpdated ? (
        <div className="mb-6 rounded-[1.5rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(224,242,254,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-sky-950 shadow-[0_12px_40px_rgba(56,189,248,0.14)]">
          Membership role updated.
        </div>
      ) : null}

      {query.inviteRevoked ? (
        <div className="mb-6 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(241,245,249,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-slate-900 shadow-[0_12px_40px_rgba(148,163,184,0.14)]">
          Pending invite revoked.
        </div>
      ) : null}

      {query.memberError ? (
        <div className="mb-6 rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.14)]">
          {query.memberError === "permissions"
            ? "You do not have permission to manage members in this workspace."
            : query.memberError === "already_member"
              ? "That email already belongs to a workspace member."
              : query.memberError === "invite_exists"
                ? "There is already a pending invite for that email."
                : query.memberError === "last_owner"
                  ? "This workspace must keep at least one owner."
                  : "Member update could not be completed."}
        </div>
      ) : null}

      {!canManageMembers ? (
        <div className="mb-6 rounded-[1.5rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(254,243,199,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-amber-950 shadow-[0_12px_40px_rgba(251,191,36,0.14)]">
          This workspace is read-only for members here. Owners and admins can update AI rules, integrations, invites, and queue controls.
        </div>
      ) : null}

      {query.gmailConnected ? (
        <div className="mb-6 rounded-[1.5rem] border border-emerald-200 bg-[linear-gradient(135deg,rgba(220,252,231,0.95),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-emerald-950 shadow-[0_12px_40px_rgba(74,222,128,0.14)]">
          Gmail connection saved for this workspace.
        </div>
      ) : null}

      {query.gmailImported ? (
        <div className="mb-6 rounded-[1.5rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(224,242,254,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-sky-950 shadow-[0_12px_40px_rgba(56,189,248,0.14)]">
          Imported {query.gmailImported} Gmail message{query.gmailImported === "1" ? "" : "s"} and skipped {query.gmailSkipped ?? "0"} duplicate or incomplete item{query.gmailSkipped === "1" ? "" : "s"}.
        </div>
      ) : null}

      {query.gmailError ? (
        <div className="mb-6 rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.14)]">
          Gmail sync error: {query.gmailError}
        </div>
      ) : null}

      {query.aiInstructionsSaved ? (
        <div className="mb-6 rounded-[1.5rem] border border-emerald-200 bg-[linear-gradient(135deg,rgba(220,252,231,0.95),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-emerald-950 shadow-[0_12px_40px_rgba(74,222,128,0.14)]">
          Workspace AI instructions saved.
        </div>
      ) : null}

      {query.settingsError ? (
        <div className="mb-6 rounded-[1.5rem] border border-rose-200 bg-[linear-gradient(135deg,rgba(255,228,230,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-rose-950 shadow-[0_12px_40px_rgba(251,113,133,0.14)]">
          {query.settingsError}
        </div>
      ) : null}

      {query.webhookProcessed ? (
        <div className="mb-6 rounded-[1.5rem] border border-teal-200 bg-[linear-gradient(135deg,rgba(204,251,241,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-teal-950 shadow-[0_12px_40px_rgba(45,212,191,0.14)]">
          {query.webhookProcessed === "demo"
            ? "Webhook queue processing requires database mode."
            : `Processed ${query.webhookProcessed} webhook event${query.webhookProcessed === "1" ? "" : "s"} with ${query.webhookFailed ?? "0"} failure${query.webhookFailed === "1" ? "" : "s"}.`}
        </div>
      ) : null}

      {query.embeddingsBackfilled ? (
        <div className="mb-6 rounded-[1.5rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(224,242,254,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-sky-950 shadow-[0_12px_40px_rgba(56,189,248,0.14)]">
          {query.embeddingsBackfilled === "demo"
            ? "Embedding backfill requires database mode."
            : `Backfilled embeddings for ${query.embeddingsBackfilled} message${query.embeddingsBackfilled === "1" ? "" : "s"}.`}
        </div>
      ) : null}

      {tenantSettingsQuery.failed ? (
        <div className="mb-6 rounded-[1.5rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(254,243,199,0.92),rgba(255,255,255,0.92))] px-4 py-4 text-sm text-amber-950 shadow-[0_12px_40px_rgba(245,158,11,0.12)]">
          Some Settings data could not be loaded, so this page is showing a reduced safe view instead of failing.
        </div>
      ) : null}

      <section className="mb-6 rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,118,110,0.94))] p-6 text-slate-100 shadow-[0_24px_90px_rgba(15,23,42,0.22)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Workspace control plane</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">Policies, people, and operational memory</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
              This is where the SaaS story becomes believable: member roles, tenant-specific AI behavior, ingestion endpoints, queue controls, and sync health all live behind one workspace boundary.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-white/15 bg-white/10 px-4 py-4 text-sm text-slate-100">
            {workspace.availableWorkspaces.length} accessible workspace{workspace.availableWorkspaces.length === 1 ? "" : "s"} for this user
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Members</p>
            <p className="mt-3 text-3xl font-semibold">{memberships.length}</p>
            <p className="mt-2 text-sm text-slate-300">{pendingInvites.length} pending invite{pendingInvites.length === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Webhooks</p>
            <p className="mt-3 text-3xl font-semibold">{webhookCounts.pending}</p>
            <p className="mt-2 text-sm text-slate-300">pending • {webhookCounts.failed} failed</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Observability</p>
            <p className="mt-3 text-3xl font-semibold">{operationalEvents.length}</p>
            <p className="mt-2 text-sm text-slate-300">{operationalCounts.ai} AI • {operationalCounts.webhooks} webhook • {operationalCounts.sync} sync</p>
          </div>
          <div className="rounded-[1.4rem] border border-white/12 bg-white/10 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Gmail</p>
            <p className="mt-3 text-3xl font-semibold">{gmailConnections.length}</p>
            <p className="mt-2 text-sm text-slate-300">connected inbox{gmailConnections.length === 1 ? "" : "es"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {settingsGroups.map((group) => (
          <section
            key={group.title}
            className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {group.title}
            </p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
              {group.items.map((item) => (
                <li key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-[1.9rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(239,246,255,0.92))] p-6 shadow-[0_24px_80px_rgba(148,163,184,0.14)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Workspace access</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Members, roles, and invites</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Owners and admins can add teammates, adjust permissions, and keep a lightweight invite queue without leaving the CRM.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
            {memberships.length} member{memberships.length === 1 ? "" : "s"} • {pendingInvites.length} pending invite{pendingInvites.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Invite teammate</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">Send access into this workspace</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Existing users are added immediately. New emails stay pending until the recipient accepts the invite link.
            </p>

            {canManageMembers && workspace.mode === "database" ? (
              <form action={inviteWorkspaceMemberAction} className="mt-5 space-y-4">
                <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Email</span>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="teammate@example.com"
                      className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-500"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Role</span>
                    <select
                      name="role"
                      defaultValue={MembershipRole.MEMBER}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-sky-500"
                    >
                      <option value={MembershipRole.MEMBER}>Member</option>
                      <option value={MembershipRole.ADMIN}>Admin</option>
                      <option value={MembershipRole.OWNER}>Owner</option>
                    </select>
                  </label>
                </div>
                <FormSubmitButton
                  idleLabel="Invite member"
                  pendingLabel="Sending invite..."
                  className="rounded-full bg-[linear-gradient(135deg,#0369a1,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(3,105,161,0.26)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(3,105,161,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </form>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                You can view membership here, but only owners and admins can send invites or update roles.
              </div>
            )}
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current members</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">Workspace roster</h4>
            <div className="mt-5 space-y-3">
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {membership.user.name ?? membership.user.email}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{membership.user.email}</p>
                    </div>

                    {canManageMembers && workspace.mode === "database" ? (
                      <form action={updateWorkspaceMemberRoleAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <select
                          name="role"
                          defaultValue={membership.role}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-950 outline-none focus:border-sky-500"
                        >
                          <option value={MembershipRole.MEMBER}>Member</option>
                          <option value={MembershipRole.ADMIN}>Admin</option>
                          <option value={MembershipRole.OWNER}>Owner</option>
                        </select>
                        <FormSubmitButton
                          idleLabel="Save role"
                          pendingLabel="Saving..."
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                        />
                      </form>
                    ) : (
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-900">
                        {membershipRoleLabel(membership.role)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pending invites</p>
          <h4 className="mt-2 text-xl font-semibold text-slate-950">Shareable acceptance links</h4>
          <div className="mt-5 space-y-3">
            {pendingInvites.length > 0 ? (
              pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{invite.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {membershipRoleLabel(invite.role)} invite
                      </p>
                      <code className="mt-3 block overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-emerald-200">
                        {`/invite/${invite.token}`}
                      </code>
                    </div>

                    {canManageMembers ? (
                      <form action={revokeWorkspaceInviteAction}>
                        <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <FormSubmitButton
                          idleLabel="Revoke"
                          pendingLabel="Revoking..."
                          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-70"
                        />
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
                No pending invites yet. New teammate invitations will appear here with an acceptance link.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[1.9rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(236,253,245,0.86))] p-6 shadow-[0_24px_80px_rgba(148,163,184,0.14)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">AI behavior</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Per-workspace AI instructions</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Give the assistant stable guidance for summaries, reply drafts, follow-up recommendations, and grounded search answers.
            </p>
          </div>
        </div>

        <form action={saveAIInstructionsAction} className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
          <input type="hidden" name="workspaceSlug" value={workspace.slug} />
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">Workspace AI instructions</span>
            <textarea
              name="aiInstructions"
              rows={6}
              defaultValue={tenantSettings?.aiInstructions ?? ""}
              className="rounded-[1.5rem] border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-500"
              placeholder="Examples: Prefer concise summaries. Treat budget mentions as high-signal. Keep reply drafts friendly but direct. Suggest next actions that fit a solo operator workflow."
            />
          </label>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              These instructions are included in AI summaries, drafts, follow-up recommendations, and grounded answers.
            </span>
            <FormSubmitButton
              idleLabel="Save AI instructions"
              pendingLabel="Saving instructions..."
              className="rounded-full bg-[linear-gradient(135deg,#16a34a,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(22,163,74,0.22)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(22,163,74,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-[1.9rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(254,249,195,0.78))] p-6 shadow-[0_24px_80px_rgba(148,163,184,0.14)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-amber-700">Gmail sync</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Import inbox conversations into CRM memory</h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Connect a Gmail inbox with a refresh token, then pull recent inbox messages into contacts, leads, conversations, embeddings, and search.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm text-slate-700">
            {gmailConnections.length} Gmail connection{gmailConnections.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Connection</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">Save workspace Gmail access</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This expects <code>GMAIL_CLIENT_ID</code> and <code>GMAIL_CLIENT_SECRET</code> in the environment, plus a Gmail refresh token for the mailbox you want to ingest.
            </p>
            {canManageMembers && workspace.mode === "database" ? (
              <form action={saveGmailConnectionAction} className="mt-5 space-y-4">
                <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Mailbox email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="founder@example.com"
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-amber-500"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  <span>Refresh token</span>
                  <textarea
                    name="refreshToken"
                    required
                    rows={4}
                    placeholder="Paste Gmail offline refresh token"
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-amber-500"
                  />
                </label>
                <FormSubmitButton
                  idleLabel="Save Gmail connection"
                  pendingLabel="Saving connection..."
                  className="rounded-full bg-[linear-gradient(135deg,#ca8a04,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(202,138,4,0.22)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(202,138,4,0.28)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </form>
            ) : null}
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Connected inboxes</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">Current Gmail sync state</h4>
            <div className="mt-5 space-y-3">
              {gmailConnections.length > 0 ? (
                gmailConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{connection.email}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {connection.provider}
                        </p>
                        <p className="mt-3 text-sm text-slate-600">
                          {connection.lastSyncedAt
                            ? `Last synced ${new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }).format(connection.lastSyncedAt)}`
                            : "No sync run yet."}
                        </p>
                        {connection.lastSyncAttemptAt ? (
                          <p className="mt-2 text-sm text-slate-600">
                            Last attempt{" "}
                            {new Intl.DateTimeFormat("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(connection.lastSyncAttemptAt)}
                          </p>
                        ) : null}
                        {connection.consecutiveFailures > 0 ? (
                          <p className="mt-2 text-sm text-rose-700">
                            Consecutive failed sync runs: {connection.consecutiveFailures}
                          </p>
                        ) : null}
                        {connection.lastError ? (
                          <p className="mt-3 text-sm leading-6 text-rose-700">{connection.lastError}</p>
                        ) : null}
                      </div>
                      {canManageMembers ? (
                        <form action={syncGmailAction}>
                          <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                          <FormSubmitButton
                            idleLabel="Sync recent Gmail"
                            pendingLabel="Syncing Gmail..."
                            className="rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
                  No Gmail mailbox connected yet. Save a refresh token first, then run a manual sync to ingest recent inbox messages.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="mt-6 rounded-[1.9rem] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(236,253,245,0.92))] p-6 shadow-[0_24px_80px_rgba(148,163,184,0.16)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-teal-700">Form webhook intake</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              Storage-first lead ingestion endpoint
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              External forms can now submit directly into this workspace. Each request is stored as a webhook event first, then processed into a contact, lead, conversation, inbound message, and AI tagging flow.
            </p>
          </div>
          <div className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
            {workspace.mode === "database" ? "Database-backed ingestion enabled" : "Requires database mode"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">POST endpoint</p>
            <code className="mt-3 block overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-sm text-emerald-200">
              {formWebhookPath}
            </code>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              If <code>FORM_WEBHOOK_SECRET</code> is set, send it in the <code>x-indie-crm-secret</code> header.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Expected JSON payload</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-sm text-sky-100">
{`{
  "name": "Maya Cole",
  "email": "maya@studiolantern.com",
  "company": "Studio Lantern",
  "title": "Brand refresh and marketing site",
  "message": "Looking for a brand refresh and a four-page site before June.",
  "source": "FORM",
  "priority": "HIGH"
}`}
            </pre>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Worker endpoint</p>
            <code className="mt-3 block overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-sm text-amber-200">
              {processorPath}
            </code>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Protect this route with <code>INTERNAL_CRON_SECRET</code> and send it as the <code>x-internal-secret</code> header from a cron job or background worker.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Scheduler example</p>
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-sm text-amber-100">
{`curl -X POST https://your-app.example.com/api/internal/process-webhooks?workspaceSlug=${workspace.slug}&limit=20 \\
  -H 'x-internal-secret: YOUR_INTERNAL_CRON_SECRET'`}
            </pre>
          </div>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Embeddings</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-950">Backfill memory embeddings</h4>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                New inbound, outbound, and note records now store embeddings automatically. Run this once to index older workspace memory for semantic search and grounded answers.
              </p>
            </div>
            <form action={backfillEmbeddingsAction}>
              <input type="hidden" name="workspaceSlug" value={workspace.slug} />
              <FormSubmitButton
                idleLabel="Backfill embeddings"
                pendingLabel="Backfilling..."
                className="rounded-full bg-[linear-gradient(135deg,#0284c7,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(2,132,199,0.26)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(2,132,199,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Vercel cron route</p>
            <code className="mt-3 block overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-sm text-emerald-200">
              {cronPath}
            </code>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Production deployments can now drain the queue through Vercel Cron Jobs using <code>CRON_SECRET</code> authorization.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current schedule</p>
            <div className="mt-3 rounded-2xl bg-slate-950 px-4 py-4 text-sm text-emerald-100">
              <p><code>0 8 * * *</code></p>
              <p className="mt-3 text-slate-300">
                Runs daily at 08:00 UTC for broad hobby-plan compatibility. Increase frequency later if you deploy on a plan that supports tighter intervals.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Processing</p>
                <h4 className="mt-2 text-xl font-semibold text-slate-950">Webhook queue controls</h4>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  New webhook requests are accepted immediately and processed after storage. Use this to retry pending or failed events while we still run without an external queue worker.
                </p>
              </div>
              <form action={processWebhookQueueAction}>
                <input type="hidden" name="workspaceSlug" value={workspace.slug} />
                <FormSubmitButton
                  idleLabel="Process pending events"
                  pendingLabel="Processing queue..."
                  className="rounded-full bg-[linear-gradient(135deg,#0f766e,#0f172a)] px-4 py-2 text-sm font-semibold !text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(15,118,110,0.34)] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </form>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-800">Pending</p>
                <p className="mt-2 text-2xl font-semibold text-amber-950">{webhookCounts.pending}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-800">Processed</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-950">{webhookCounts.processed}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-rose-800">Failed</p>
                <p className="mt-2 text-2xl font-semibold text-rose-950">{webhookCounts.failed}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recent events</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">Webhook delivery history</h4>

            <div className="mt-5 space-y-3">
              {webhookEvents.length > 0 ? (
                webhookEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {event.source} • {event.eventType}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          Received {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(event.receivedAt)}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                          Attempts {event.retryCount} / {event.maxRetries}
                          {event.nextRetryAt
                            ? ` • next retry ${new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              }).format(event.nextRetryAt)}`
                            : ""}
                        </p>
                        {event.errorMessage ? (
                          <p className="mt-3 text-sm leading-6 text-rose-700">{event.errorMessage}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          event.status === WebhookEventStatus.PROCESSED
                            ? "bg-emerald-100 text-emerald-900"
                            : event.status === WebhookEventStatus.FAILED
                              ? "bg-rose-100 text-rose-900"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {event.status.toLowerCase()}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  No webhook events yet. Send a form submission to the endpoint above to start building integration history for this workspace.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Observability</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">Failure signals</h4>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Recent AI fallbacks, webhook processor failures, and Gmail sync/import issues are stored here so production problems leave a trail.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-800">AI</p>
                <p className="mt-2 text-2xl font-semibold text-sky-950">{operationalCounts.ai}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-800">Webhooks</p>
                <p className="mt-2 text-2xl font-semibold text-amber-950">{operationalCounts.webhooks}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-rose-800">Sync</p>
                <p className="mt-2 text-2xl font-semibold text-rose-950">{operationalCounts.sync}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Recent failures</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950">Operational event feed</h4>

            <div className="mt-5 space-y-3">
              {operationalEvents.length > 0 ? (
                operationalEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{event.source}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {event.level} •{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(event.createdAt)}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-rose-700">{event.message}</p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                  No operational failures logged yet. AI fallbacks, webhook failures, and Gmail sync issues will appear here when they happen.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
