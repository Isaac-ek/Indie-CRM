import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";

export default async function IndexPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (session.user.demoSlug) {
    if ((session.user.demoExpiresAt ?? 0) <= Date.now()) redirect("/demo?expired=1");
    redirect(`/w/${session.user.demoSlug}/leads?layout=kanban`);
  }

  if (!process.env.DATABASE_URL) {
    redirect("/w/northstar-studio");
  }

  const prisma = getPrismaClient();
  const membership = await prisma.membership.findFirst({
    where: {
      user: {
        email: session.user.email,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      tenant: {
        select: {
          slug: true,
        },
      },
    },
  });

  redirect(`/w/${membership?.tenant.slug ?? "northstar-studio"}`);
}
