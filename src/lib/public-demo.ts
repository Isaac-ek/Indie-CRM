import { createHmac, randomUUID } from "node:crypto";
import { getPrismaClient } from "@/lib/prisma";

export function publicDemoEnabled() {
  return process.env.PUBLIC_DEMO_ENABLED === "true" && !!process.env.DATABASE_URL && !!process.env.AUTH_SECRET;
}

export async function isPublicDemoTenant(tenantId: string) {
  return !!(await getPrismaClient().publicDemo.findUnique({ where: { tenantId }, select: { id: true } }));
}

// This is called only by Auth.js's CSRF-protected credentials sign-in endpoint.
export async function createPublicDemo(headers: Headers) {
  if (!publicDemoEnabled()) return null;
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
  const clientHash = createHmac("sha256", process.env.AUTH_SECRET!).update(ip).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);

  return getPrismaClient().$transaction(async (tx) => {
    // Database limits apply across serverless instances, including without Redis.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(482316071)`;
    const expired = await tx.publicDemo.findMany({ where: { expiresAt: { lte: now } }, select: { tenantId: true, userId: true } });
    for (const demo of expired) {
      await tx.tenant.delete({ where: { id: demo.tenantId } });
      await tx.user.delete({ where: { id: demo.userId } });
    }
    if (await tx.publicDemo.count() >= 100) return null;
    if (await tx.publicDemo.count({ where: { clientHash, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } } }) >= 5) return null;

    const key = randomUUID();
    const user = await tx.user.create({ data: { email: `visitor-${key}@demo.indie-crm.test`, name: "Demo visitor" } });
    const tenant = await tx.tenant.create({ data: {
      slug: `demo-${key}`, name: "Your sample pipeline",
      memberships: { create: { userId: user.id, role: "MEMBER" } },
    } });
    await tx.publicDemo.create({ data: { tenantId: tenant.id, userId: user.id, clientHash, expiresAt } });
    const samples = [
      { name: "Maya Chen", company: "Juniper Studio", title: "Juniper website launch", stage: "NEW" as const, summary: "A fictional studio needs a new website. Confirm the scope and arrange a discovery call." },
      { name: "Sam Okafor", company: "Cedar Goods", title: "Cedar packaging refresh", stage: "PROPOSAL" as const, summary: "A fictional retailer is reviewing a packaging proposal. Follow up on the variant list." },
      { name: "Alex Rivera", company: "Fieldwork", title: "Fieldwork support retainer", stage: "FOLLOW_UP" as const, summary: "A fictional team is considering ongoing support. Agree on a start date." },
    ];
    for (const [index, sample] of samples.entries()) {
      const contact = await tx.contact.create({ data: { tenantId: tenant.id, name: sample.name, company: sample.company, email: `sample-${index}@example.test` } });
      const lead = await tx.lead.create({ data: {
        tenantId: tenant.id, contactId: contact.id, createdById: user.id, title: sample.title,
        stage: sample.stage, source: "MANUAL", priority: "MEDIUM", summary: sample.summary,
        nextAction: "Confirm the next step with the client.",
        followUpAt: new Date(now.getTime() + (index + 1) * 86_400_000),
      } });
      await tx.note.create({ data: { tenantId: tenant.id, leadId: lead.id, authorId: user.id, content: `Sample brief: ${sample.summary}` } });
    }
    return { ...user, demoSlug: tenant.slug, demoExpiresAt: expiresAt.getTime() };
  }, { timeout: 20_000 });
}
