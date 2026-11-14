import { test as base, expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, LeadStage } from "../../src/generated/prisma/client";
import { workflowDatabaseUrl } from "./workflow-database";

const password = "workflow-proof-password-2026";
type Scenario = Awaited<ReturnType<typeof createScenario>>;

async function createScenario(database: PrismaClient) {
  const key = randomUUID().slice(0, 8);
  const passwordHash = await hash(password, 8);
  const owner = await database.user.create({ data: { email: `owner-${key}@workflow.test`, name: "Proof Owner", passwordHash } });
  const member = await database.user.create({ data: { email: `member-${key}@workflow.test`, name: "Proof Member", passwordHash } });
  const outsider = await database.user.create({ data: { email: `outsider-${key}@workflow.test`, name: "Other Workspace Owner", passwordHash } });
  const workspace = await database.tenant.create({
    data: { name: "Workflow Proof", slug: `workflow-${key}`, memberships: { create: [{ userId: owner.id, role: "OWNER" }, { userId: member.id, role: "MEMBER" }] } },
  });
  const otherWorkspace = await database.tenant.create({
    data: { name: "Separate Workspace", slug: `separate-${key}`, memberships: { create: { userId: outsider.id, role: "OWNER" } } },
  });
  const leads = await Promise.all(Object.values(LeadStage).map(async (stage) => {
    const contact = await database.contact.create({ data: { tenantId: workspace.id, name: `Proof ${stage}`, email: `${stage.toLowerCase()}-${key}@workflow.test`, company: "Proof Studio" } });
    return database.lead.create({ data: { tenantId: workspace.id, contactId: contact.id, createdById: owner.id, title: `Proof ${stage} opportunity`, stage, source: "MANUAL", priority: "HIGH" } });
  }));
  const contact = await database.contact.create({ data: { tenantId: otherWorkspace.id, name: "Private Contact", email: `private-${key}@workflow.test` } });
  const privateLead = await database.lead.create({ data: { tenantId: otherWorkspace.id, contactId: contact.id, title: `Private opportunity ${key}`, source: "MANUAL", stage: "NEW" } });
  return { key, owner, member, outsider, workspace, otherWorkspace, leads, privateLead };
}

export const test = base.extend<{ scenario: Scenario }, { database: PrismaClient }>({
  // Playwright requires a destructured first parameter even for a fixture with no dependencies.
  // eslint-disable-next-line no-empty-pattern
  database: [async ({}, use) => {
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: workflowDatabaseUrl() }) });
    try { await use(database); } finally { await database.$disconnect(); }
  }, { scope: "worker" }],
  scenario: async ({ database }, use) => {
    const scenario = await createScenario(database);
    try { await use(scenario); } finally {
      await database.tenant.deleteMany({ where: { id: { in: [scenario.workspace.id, scenario.otherWorkspace.id] } } });
      await database.user.deleteMany({ where: { id: { in: [scenario.owner.id, scenario.member.id, scenario.outsider.id] } } });
    }
  },
});

export async function login(page: Page, email: string) {
  // Each fresh browser session represents a separate client for auth rate limits.
  const address = createHash("sha256").update(email).digest("hex").slice(0, 16).match(/.{4}/g)!.join(":");
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `2001:db8:${address}::1` });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/w\//);
  await expect(page.getByText("OWNER • Database connected", { exact: true }).or(page.getByText("MEMBER • Database connected", { exact: true }))).toBeVisible();
}

export { expect };
