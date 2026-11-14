import test from "node:test";
import assert from "node:assert/strict";
import { workflowDatabaseUrl } from "../e2e/fixtures/workflow-database";

test("workflow fixtures refuse remote, shared and unspecified database targets", () => {
  const previous = process.env.E2E_DATABASE_URL;
  try {
    delete process.env.E2E_DATABASE_URL;
    assert.throws(workflowDatabaseUrl, /Set E2E_DATABASE_URL/);
    for (const value of [
      "postgresql://user@production.example.com/indie_crm_workflow_ci",
      "postgresql://user@127.0.0.1/indie_crm",
      "postgresql://user@127.0.0.1/postgres",
      "https://127.0.0.1/indie_crm_workflow_ci",
    ]) {
      process.env.E2E_DATABASE_URL = value;
      assert.throws(workflowDatabaseUrl, /refusing this connection/);
    }
    process.env.E2E_DATABASE_URL = "postgresql://user@127.0.0.1:5432/indie_crm_workflow_ci";
    assert.equal(workflowDatabaseUrl(), process.env.E2E_DATABASE_URL);
  } finally {
    if (previous === undefined) delete process.env.E2E_DATABASE_URL;
    else process.env.E2E_DATABASE_URL = previous;
  }
});
