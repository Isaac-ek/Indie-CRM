"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { MembershipRole } from "@/generated/prisma/client";
import { signIn, signOut } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";
import { requiredEmail, requiredTrimmedString } from "@/lib/validation";
import { slugifyWorkspaceName } from "@/lib/workspace-slug";

export async function loginAction(formData: FormData) {
  const email = requiredEmail(formData, "email");
  const password = requiredTrimmedString(formData, "password", { maxLength: 200 });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=invalid_credentials");
    }

    throw error;
  }
}

export async function logoutAction() {
  await signOut({
    redirectTo: "/login",
  });
}

export async function registerAction(formData: FormData) {
  if (!process.env.DATABASE_URL) {
    redirect("/register?error=database_required");
  }

  const name = requiredTrimmedString(formData, "name", { maxLength: 120 });
  const email = requiredEmail(formData, "email");
  const password = requiredTrimmedString(formData, "password", { maxLength: 200 });
  const workspaceName = requiredTrimmedString(formData, "workspaceName", { maxLength: 120 });

  if (password.length < 8) {
    redirect("/register?error=password_length");
  }

  const prisma = getPrismaClient();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    redirect("/register?error=user_exists");
  }

  const baseSlug = slugifyWorkspaceName(workspaceName) || "workspace";
  let slug = baseSlug;
  let counter = 1;

  while (
    await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    })
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  const passwordHash = await hash(password, 12);

  const tenant = await prisma.tenant.create({
    data: {
      slug,
      name: workspaceName,
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  await prisma.membership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      role: MembershipRole.OWNER,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?registered=1");
    }

    throw error;
  }
}
