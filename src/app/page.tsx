import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";

export default async function IndexPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
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
