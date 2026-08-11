"use server";

import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MembershipRole } from "@/generated/prisma/client";
import { signIn, signOut } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";
import { requiredEmail, requiredTrimmedString, validatePasswordStrength } from "@/lib/validation";
import { slugifyWorkspaceName } from "@/lib/workspace-slug";
import { rethrowIfRedirect } from "@/lib/errors";
import { logInfo, logWarn, logError } from "@/lib/logger";

async function getRequestContext() {
  try {
    const reqHeaders = await headers();
    const requestId = reqHeaders.get("x-request-id") || undefined;
    return { requestId };
  } catch {
    return { requestId: undefined };
  }
}

export async function loginAction(formData: FormData) {
  const email = requiredEmail(formData, "email");
  const password = requiredTrimmedString(formData, "password", { maxLength: 200 });
  const { requestId } = await getRequestContext();

  logInfo(`Authentication attempt for email: ${email}`, { requestId, email });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    rethrowIfRedirect(error);

    if (error instanceof AuthError) {
      logWarn(`Failed authentication attempt for email: ${email}`, { requestId, email });
      redirect("/login?error=invalid_credentials");
    }

    logError(`Unexpected error during login for email: ${email}`, error, { requestId, email });
    throw error;
  }
}

export async function logoutAction() {
  const { requestId } = await getRequestContext();
  logInfo("User signing out", { requestId });
  await signOut({
    redirectTo: "/login",
  });
}

export async function registerAction(formData: FormData) {
  const { requestId } = await getRequestContext();

  if (!process.env.DATABASE_URL) {
    logWarn("Registration attempted without DATABASE_URL configured", { requestId });
    redirect("/register?error=database_required");
  }

  const name = requiredTrimmedString(formData, "name", { maxLength: 120 });
  const email = requiredEmail(formData, "email");
  const password = requiredTrimmedString(formData, "password", { maxLength: 200 });
  const workspaceName = requiredTrimmedString(formData, "workspaceName", { maxLength: 120 });

  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    logWarn(`Registration password validation failed for email: ${email}`, { requestId, email });
    redirect("/register?error=password_length");
  }

  const prisma = getPrismaClient();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    logWarn(`Registration attempted for existing email: ${email}`, { requestId, email });
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

  logInfo(`Successfully registered user [${user.id}] and workspace [${tenant.slug}]`, {
    requestId,
    userId: user.id,
    tenantId: tenant.id,
    email,
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    rethrowIfRedirect(error);

    if (error instanceof AuthError) {
      redirect("/login?registered=1");
    }

    throw error;
  }
}
