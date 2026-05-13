import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/prisma";

export type CurrentUserContext = {
  id: string | null;
  email: string;
  name: string;
  mode: "database" | "demo";
};

const demoUser = {
  id: null,
  email: "owner@northstarstudio.test",
  name: "Chiemelie Ekezie",
  mode: "demo" as const,
};

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!process.env.DATABASE_URL) {
    return {
      ...demoUser,
      id: session.user.id ?? null,
      email: session.user.email,
      name: session.user.name ?? demoUser.name,
    };
  }

  try {
    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      redirect("/register");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email,
      mode: "database",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return {
        ...demoUser,
        id: session.user.id ?? null,
        email: session.user.email,
        name: session.user.name ?? demoUser.name,
      };
    }

    throw error;
  }
}
