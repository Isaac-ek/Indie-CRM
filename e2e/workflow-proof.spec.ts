import { test, expect, login } from "./fixtures/workflow";

test("all six stages retain their leads and stage changes survive reload", async ({ page, scenario, database }) => {
  await login(page, scenario.owner.email);
  const boardPath = `/w/${scenario.workspace.slug}/leads?layout=kanban`;
  await page.goto(boardPath);
  for (const [stage, label] of [["NEW", "New Leads"], ["QUALIFIED", "Qualified"], ["PROPOSAL", "Proposal"], ["FOLLOW_UP", "Follow-up"], ["WON", "Deal Won"], ["LOST", "Lost"]]) {
    await expect(page.getByRole("region", { name: `${label} pipeline`, exact: true }).getByRole("link", { name: `Proof ${stage} opportunity`, exact: true })).toBeVisible();
  }
  const lead = scenario.leads.find((item) => item.stage === "NEW")!;
  await page.getByRole("combobox", { name: "Move Proof NEW to stage", exact: true }).selectOption("Follow-up");
  await expect(page.getByRole("region", { name: "Follow-up pipeline", exact: true }).getByRole("link", { name: lead.title, exact: true })).toBeVisible();
  await expect(page).toHaveURL(/layout=kanban/);
  expect((await database.lead.findUniqueOrThrow({ where: { id: lead.id } })).stage).toBe("FOLLOW_UP");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Move Proof NEW to stage", exact: true })).toHaveValue("Follow-up");
  await expect(page.getByText("Score:", { exact: true })).toHaveCount(0);
});

test("dragging a lead saves the selected stage and keeps the board open", async ({ page, scenario, database }) => {
  await login(page, scenario.owner.email);
  await page.goto(`/w/${scenario.workspace.slug}/leads?layout=kanban`);
  const link = page.getByRole("region", { name: "New Leads pipeline", exact: true }).getByRole("link", { name: "Proof NEW opportunity", exact: true });
  const target = page.getByRole("region", { name: "Proposal pipeline", exact: true });
  await link.locator("..").dragTo(target);
  await expect(target.getByRole("link", { name: "Proof NEW opportunity", exact: true })).toBeVisible();
  const lead = scenario.leads.find((item) => item.stage === "NEW")!;
  expect((await database.lead.findUniqueOrThrow({ where: { id: lead.id } })).stage).toBe("PROPOSAL");
  await expect(page).toHaveURL(/layout=kanban/);
  await page.reload();
  await expect(target.getByRole("link", { name: "Proof NEW opportunity", exact: true })).toBeVisible();
});

test("create, qualify, schedule, share a note and retrieve the lead across two real users", async ({ page, browser, scenario, database }) => {
  await login(page, scenario.owner.email);
  await page.goto(`/w/${scenario.workspace.slug}/leads`);
  await page.getByText("＋ Add lead", { exact: true }).click();
  await page.getByLabel("Lead Name", { exact: true }).fill("Maya Proof");
  const email = `maya-${scenario.key}@workflow.test`;
  await page.getByLabel("Email Address", { exact: true }).fill(email);
  await page.getByLabel("Company", { exact: true }).fill("Sample Studio");
  await page.getByLabel("Opportunity Title", { exact: true }).fill("Sample brand refresh");
  await page.getByLabel("Initial Inquiry / Context", { exact: true }).fill("We need a brand refresh and a marketing site before launch.");
  await page.getByRole("button", { name: "Create Lead", exact: true }).click();
  await expect(page).toHaveURL(/created=1/);
  const lead = await database.lead.findFirstOrThrow({ where: { tenantId: scenario.workspace.id, contact: { email } } });
  expect(lead.stage).toBe("NEW");
  const detailPath = `/w/${scenario.workspace.slug}/leads/${lead.id}`;
  const teammateContext = await browser.newContext();
  try {
    const teammate = await teammateContext.newPage();
    await login(teammate, scenario.member.email);
    await teammate.goto(detailPath);
    await expect(teammate.locator("main header").getByText("New", { exact: true })).toBeVisible();
    await page.goto(detailPath);

    await page.getByRole("combobox", { name: "Stage", exact: true }).selectOption("Qualified");
    await page.getByLabel("Follow-up date", { exact: true }).fill("2099-06-10");
    await page.getByRole("button", { name: "Save workflow", exact: true }).click();
    await expect(page).toHaveURL(/workflowUpdated=1/);
    const saved = await database.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(saved.stage).toBe("QUALIFIED");
    expect(saved.followUpAt?.toISOString().slice(0, 10)).toBe("2099-06-10");
    // Route revalidation is not a broadcast into a page already open in another session.
    await expect(teammate.locator("main header").getByText("New", { exact: true })).toBeVisible();
    await teammate.reload();
    await expect(teammate.locator("main header").getByText("Qualified", { exact: true })).toBeVisible();

    await expect(teammate.getByLabel("Follow-up date", { exact: true })).toHaveValue("2099-06-10");

    const note = `Discovery checkpoint ${scenario.key}: agreed a sample scope and next action.`;
    await teammate.getByLabel("Add internal note", { exact: true }).fill(note);
    await teammate.getByRole("button", { name: "Save note", exact: true }).click();
    await expect(teammate).toHaveURL(/noteCreated=1/);
    const savedNote = await database.note.findFirstOrThrow({ where: { leadId: lead.id, content: note } });
    expect(savedNote.tenantId).toBe(scenario.workspace.id);
    expect(savedNote.authorId).toBe(scenario.member.id);
    await page.reload();

    await expect(page.getByText(note, { exact: true })).toBeVisible();
    await page.goto(`/w/${scenario.workspace.slug}/search`);
    await page.getByLabel("Search Client Memory", { exact: true }).fill(`Discovery checkpoint ${scenario.key}`);
    await page.getByRole("button", { name: "Search Memory", exact: true }).click();
    await expect(page.getByRole("link").filter({ hasText: "Maya Proof" }).first()).toBeVisible();
    expect(await database.auditLog.count({ where: { tenantId: scenario.workspace.id, targetId: lead.id } })).toBeGreaterThanOrEqual(3);
  } finally { await teammateContext.close(); }
});

test("a member cannot delete a lead even when submitting an owner's deletion form", async ({ page, browser, scenario, database }) => {
  const lead = scenario.leads[0];
  const detailPath = `/w/${scenario.workspace.slug}/leads/${lead.id}`;
  await login(page, scenario.owner.email);
  await page.goto(detailPath);

  // Capture a genuine server-action request, aborting it before the owner's delete reaches the server.
  let deletion: { headers: Record<string, string>; body: Buffer } | undefined;
  await page.route(`**${detailPath}`, async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      deletion = { headers: request.headers(), body: request.postDataBuffer()! };
      await route.abort();
    } else await route.continue();
  });
  await page.getByText("Archive or delete", { exact: true }).click();
  await page.getByPlaceholder("DELETE", { exact: true }).fill("DELETE");
  await page.getByRole("button", { name: "Delete Permanently", exact: true }).click();
  await expect.poll(() => !!deletion).toBe(true);
  const memberContext = await browser.newContext();
  try {
    const member = await memberContext.newPage();
    await login(member, scenario.member.email);
    await member.goto(detailPath);

    await expect(member.getByRole("button", { name: "Delete Permanently", exact: true })).toHaveCount(0);
    const response = await member.request.post(detailPath, {
      data: deletion!.body,
      headers: {
        "content-type": deletion!.headers["content-type"],
        "next-action": deletion!.headers["next-action"],
        Origin: new URL(member.url()).origin,
      },
    });
    expect(response.headers()["x-action-redirect"]).toContain("permissionError=delete");
    expect(await database.lead.findUnique({ where: { id: lead.id } })).not.toBeNull();
    expect(await database.auditLog.count({ where: { targetId: lead.id } })).toBe(0);
    await page.unroute(`**${detailPath}`);
    await page.goto(detailPath);

    await page.getByText("Archive or delete", { exact: true }).click();

    await page.getByPlaceholder("DELETE", { exact: true }).fill("DELETE");
    await page.getByRole("button", { name: "Delete Permanently", exact: true }).click();
    await expect(page).toHaveURL(/leadDeleted=1/);
    expect(await database.lead.findUnique({ where: { id: lead.id } })).toBeNull();
    expect(await database.auditLog.count({ where: { targetId: lead.id } })).toBe(1);
  } finally { await memberContext.close(); }
});

test("another workspace's lead cannot be read, updated or given a note", async ({ page, scenario, database }) => {
  await login(page, scenario.owner.email);
  const otherPath = `/w/${scenario.otherWorkspace.slug}/leads/${scenario.privateLead.id}`;
  await page.goto(otherPath);
  // A streamed Next.js response can already have sent HTTP 200 before notFound().
  // Check the denial actually rendered and that no private record was disclosed.
  await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This page could not be found.", exact: true })).toBeVisible();
  await expect(page.getByText(scenario.privateLead.title, { exact: true })).toHaveCount(0);
  const lead = scenario.leads[0];
  const detailPath = `/w/${scenario.workspace.slug}/leads/${lead.id}`;
  await page.goto(detailPath);

  const workflowForm = page.getByRole("button", { name: "Save workflow", exact: true }).locator("xpath=ancestor::form");
  await workflowForm.locator('input[name="leadId"]').evaluate((input, id) => { (input as HTMLInputElement).value = id; }, scenario.privateLead.id);
  await page.getByRole("combobox", { name: "Stage", exact: true }).selectOption("Won");
  await page.getByRole("button", { name: "Save workflow", exact: true }).click();
  await expect(page.getByText("This page could not be found.", { exact: true })).toBeVisible();
  expect((await database.lead.findUniqueOrThrow({ where: { id: scenario.privateLead.id } })).stage).toBe("NEW");
  expect(await database.auditLog.count({ where: { targetId: scenario.privateLead.id } })).toBe(0);
  await page.goto(detailPath);

  const noteForm = page.getByRole("button", { name: "Save note", exact: true }).locator("xpath=ancestor::form");
  await noteForm.locator('input[name="leadId"]').evaluate((input, id) => { (input as HTMLInputElement).value = id; }, scenario.privateLead.id);
  await page.getByLabel("Add internal note", { exact: true }).fill("This cross-workspace write must fail.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(page.getByText("This page could not be found.", { exact: true })).toBeVisible();
  expect(await database.note.count({ where: { leadId: scenario.privateLead.id } })).toBe(0);
  expect(await database.auditLog.count({ where: { targetId: scenario.privateLead.id } })).toBe(0);
});

test("workspace home opens the board, filters retain the layout, and mobile follow-up stays usable", async ({
  page,
  scenario,
  database,
}) => {
  await login(page, scenario.owner.email);
  await page.goto(`/w/${scenario.workspace.slug}`);
  await expect(page).toHaveURL(/\/leads\?layout=kanban/);
  await expect(
    page.getByRole("heading", { name: "Pipeline", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Lead Name", { exact: true })).not.toBeVisible();
  await expect(
    page.getByRole("link", { name: "AI Scanner", exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("Search pipeline", { exact: true }).fill("Proof NEW");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/layout=kanban/);
  await expect(
    page.getByRole("link", { name: "Proof NEW opportunity", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "List", exact: true }).click();
  await page.getByRole("link", { name: "High priority", exact: true }).click();
  await expect(page).toHaveURL(/layout=list/);
  await expect(page.getByLabel("Search pipeline", { exact: true })).toHaveValue(
    "Proof NEW",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Proof NEW", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Stage", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Add internal note", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByText("Edit next action, summary & tags", { exact: true })
    .click();
  const nextAction = `Send the agreed scope ${scenario.key}`;
  await page.getByRole("textbox", { name: "Next action", exact: true }).fill(nextAction);
  await page
    .getByRole("button", { name: "Save next action & context", exact: true })
    .click();
  await expect(page).toHaveURL(/intelligenceUpdated=1/);
  const lead = scenario.leads.find((item) => item.stage === "NEW")!;
  expect(
    (await database.lead.findUniqueOrThrow({ where: { id: lead.id } }))
      .nextAction,
  ).toBe(nextAction);
  await page.goto(`/w/${scenario.workspace.slug}/leads?layout=kanban`);
  await expect(page.getByText(nextAction, { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
