import { randomUUID } from "node:crypto";
import { test, expect } from "./fixtures/workflow";
import type { Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

async function startDemo(page: Page) {
  const key = randomUUID().replaceAll("-", "").slice(0, 12);
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `2001:db8:${key.match(/.{4}/g)!.join(":")}::1` });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Try the sample pipeline", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/demo-[^/]+\/leads\?layout=kanban/);
  await expect(page.getByRole("complementary", { name: "Demo guide" })).toBeVisible();
  return new URL(page.url()).pathname.split("/")[2];
}

test("public visitors save a real workflow and get separate workspaces", async ({ page, browser, database }) => {
  const slugs: string[] = [];
  const otherContext = await browser.newContext();
  try {
    const slug = await startDemo(page); slugs.push(slug);
    const tenant = await database.tenant.findUniqueOrThrow({ where: { slug } });
    const lead = await database.lead.findFirstOrThrow({ where: { tenantId: tenant.id, title: "Juniper website launch" } });
    await expect(page.getByRole("link", { name: "AI Scanner", exact: false })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Settings", exact: false })).toHaveCount(0);
    await page.getByRole("combobox", { name: "Move Maya Chen to stage", exact: true }).selectOption("Qualified");
    await expect(page.getByRole("region", { name: "Qualified pipeline", exact: true }).getByRole("link", { name: "Juniper website launch", exact: true })).toBeVisible();
    await page.goto(`/w/${slug}/leads/${lead.id}`);

    await page.getByLabel("Follow-up date", { exact: true }).fill("2099-06-10");
    await page.getByRole("button", { name: "Save workflow", exact: true }).click();
    await expect(page).toHaveURL(/workflowUpdated=1/);

    const note = `Juniper discovery checkpoint ${randomUUID()}`;
    await page.getByLabel("Add internal note", { exact: true }).fill(note);
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(page).toHaveURL(/noteCreated=1/);
    const saved = await database.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(saved.stage).toBe("QUALIFIED");
    expect(saved.followUpAt?.toISOString().slice(0, 10)).toBe("2099-06-10");
    const sameSession = await page.context().newPage();
    await sameSession.goto(`/w/${slug}/search?q=${encodeURIComponent(note)}`);
    await expect(sameSession.getByRole("link").filter({ hasText: "Maya Chen" }).first()).toBeVisible();
    await sameSession.close();
    const other = await otherContext.newPage();
    const otherSlug = await startDemo(other); slugs.push(otherSlug);
    expect(otherSlug).not.toBe(slug);
    await other.goto(`/w/${slug}/leads/${lead.id}`);
    await expect(other).toHaveURL(new RegExp(`/w/${otherSlug}/leads`));
    await other.goto(`/w/${otherSlug}/search?q=${encodeURIComponent(note)}`);
    await expect(other.getByText(note, { exact: true })).toHaveCount(0);
    const otherTenant = await database.tenant.findUniqueOrThrow({ where: { slug: otherSlug } });
    expect(await database.note.count({ where: { tenantId: otherTenant.id, content: note } })).toBe(0);
  } finally {
    await otherContext.close();
    for (const slug of slugs) {
      const demo = await database.publicDemo.findFirst({ where: { tenant: { slug } } });
      if (demo) { await database.tenant.delete({ where: { id: demo.tenantId } }); await database.user.delete({ where: { id: demo.userId } }); }
    }
  }
});

test("an expired database session cannot write and restarting removes only its temporary data", async ({ page, database, scenario }) => {
  const slugs: string[] = [];
  try {
    const slug = await startDemo(page); slugs.push(slug);
    const demo = await database.publicDemo.findFirstOrThrow({ where: { tenant: { slug } } });
    const lead = await database.lead.findFirstOrThrow({ where: { tenantId: demo.tenantId, stage: "NEW" } });
    await page.goto(`/w/${slug}/leads/${lead.id}`);

    await page.getByLabel("Add internal note", { exact: true }).fill("Must not be saved after expiry");
    // JWT remains valid: the server must also check the database lifecycle record.
    await database.publicDemo.update({ where: { id: demo.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await page.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(page).toHaveURL(/\/demo\?expired=1/);
    expect(await database.note.count({ where: { tenantId: demo.tenantId, content: "Must not be saved after expiry" } })).toBe(0);
    await page.getByRole("button", { name: "Try the sample pipeline", exact: true }).click();
    await expect(page).toHaveURL(/\/w\/demo-[^/]+\/leads/);
    const freshSlug = new URL(page.url()).pathname.split("/")[2]; slugs.push(freshSlug);
    expect(freshSlug).not.toBe(slug);
    expect(await database.tenant.findUnique({ where: { id: demo.tenantId } })).toBeNull();
    expect(await database.user.findUnique({ where: { id: demo.userId } })).toBeNull();
    expect(await database.tenant.findUnique({ where: { id: scenario.workspace.id } })).not.toBeNull();
  } finally {
    for (const slug of slugs) {
      const demo = await database.publicDemo.findFirst({ where: { tenant: { slug } } });
      if (demo) { await database.tenant.delete({ where: { id: demo.tenantId } }); await database.user.delete({ where: { id: demo.userId } }); }
    }
  }
});

test("demo sessions cannot use upload APIs, administration, or webhook ingestion", async ({ page, database }) => {
  const slug = await startDemo(page);
  const demo = await database.publicDemo.findFirstOrThrow({ where: { tenant: { slug } } });
  try {
    for (const path of ["settings", "scanner", "analytics"]) {
      await page.goto(`/w/${slug}/${path}`);
      await expect(page).toHaveURL(new RegExp(`/w/${slug}/leads`));
    }
    const upload = await page.request.post(`/api/workspaces/${slug}/image-workflow`, { data: { presetKey: "badge" } });
    expect(upload.status()).toBe(403);
    const exportResult = await page.request.get(`/api/workspaces/${slug}/export-report`);
    expect(exportResult.status()).toBe(403);
    const webhook = await page.request.post(`/api/webhooks/forms/${slug}`, { data: { name: "Injection", email: "injection@example.test", message: "Should not enter the demo" } });
    expect(webhook.status()).toBe(404);
    expect(await database.webhookEvent.count({ where: { tenantId: demo.tenantId } })).toBe(0);
    expect(await database.lead.count({ where: { tenantId: demo.tenantId } })).toBe(3);
  } finally {
    await database.tenant.delete({ where: { id: demo.tenantId } });
    await database.user.delete({ where: { id: demo.userId } });
  }
});

test("demo AI stays local even with a configured provider key", async ({ page, database }) => {
  const slug = await startDemo(page);
  const demo = await database.publicDemo.findFirstOrThrow({ where: { tenant: { slug } } });
  try {
    const { stdout } = await promisify(execFile)(process.execPath, ["--import", "tsx", "e2e/fixtures/assert-demo-ai.cts", demo.tenantId], { timeout: 45_000, env: { ...process.env, NODE_OPTIONS: "" } });
    expect(stdout).toContain("zero HTTP attempts");
  } finally {
    await database.tenant.delete({ where: { id: demo.tenantId } });
    await database.user.delete({ where: { id: demo.userId } });
  }
});
