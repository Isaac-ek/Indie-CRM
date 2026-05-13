import Link from "next/link";
import { auth } from "@/auth";
import { FormSubmitButton } from "@/components/form-submit-button";
import { WorkspaceInviteStatus } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import { acceptWorkspaceInviteAction } from "@/lib/settings-actions";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function InvitePage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const query = await searchParams;
  const session = await auth();

  if (!process.env.DATABASE_URL) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Workspace invite</p>
          <h1 className="mt-3 text-3xl font-semibold">Invites require database mode</h1>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            This invite flow only works when the app is running with a configured database.
          </p>
        </div>
      </main>
    );
  }

  const prisma = getPrismaClient();
  const invite = await prisma.workspaceInvite.findUnique({
    where: {
      token,
    },
    select: {
      email: true,
      role: true,
      status: true,
      tenant: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  const isPending = invite?.status === WorkspaceInviteStatus.PENDING;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_32%),linear-gradient(180deg,#020617,#0f172a)] px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-300">Workspace invite</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {invite ? `Join ${invite.tenant.name}` : "Invite not found"}
        </h1>

        {invite ? (
          <p className="mt-4 text-sm leading-7 text-slate-200">
            This invite is for <strong>{invite.email}</strong> with the role of{" "}
            <strong>{invite.role.toLowerCase()}</strong>.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-7 text-slate-200">
            The invitation link is missing or no longer valid.
          </p>
        )}

        {query.error === "email_mismatch" ? (
          <div className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-100/10 px-4 py-4 text-sm text-amber-100">
            Sign in with the invited email address to accept this workspace invite.
          </div>
        ) : null}

        {!invite || !isPending ? (
          <div className="mt-6 rounded-2xl border border-slate-200/10 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-300">
            {invite?.status === WorkspaceInviteStatus.ACCEPTED
              ? "This invite has already been accepted."
              : invite?.status === WorkspaceInviteStatus.REVOKED
                ? "This invite has been revoked by the workspace team."
                : "There is no active invitation attached to this link."}
          </div>
        ) : session?.user?.email ? (
          <form action={acceptWorkspaceInviteAction} className="mt-8 space-y-4">
            <input type="hidden" name="token" value={token} />
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-200">
              Signed in as <strong>{session.user.email}</strong>.
            </div>
            <FormSubmitButton
              idleLabel="Accept workspace invite"
              pendingLabel="Joining workspace..."
              className="rounded-full bg-[linear-gradient(135deg,#0ea5e9,#22c55e)] px-5 py-3 text-sm font-semibold !text-slate-950 shadow-[0_12px_30px_rgba(14,165,233,0.24)] transition hover:scale-[1.01] hover:shadow-[0_18px_40px_rgba(14,165,233,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-slate-200">
              Sign in with <strong>{invite.email}</strong> to accept this invite.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Go to login
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Create account
              </Link>
            </div>
          </div>
        )}

        {invite ? (
          <p className="mt-8 text-sm text-slate-400">
            After acceptance you&apos;ll be redirected into the invited workspace automatically.
          </p>
        ) : null}
      </div>
    </main>
  );
}
