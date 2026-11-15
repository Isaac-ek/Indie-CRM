import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const buildScript = fileURLToPath(new URL("../scripts/vercel-build.mjs", import.meta.url));

function build(environment: Record<string, string>) {
  const directory = mkdtempSync(path.join(tmpdir(), "crm-release-build-"));
  const log = path.join(directory, "commands.jsonl");
  try {
    writeFileSync(path.join(directory, "npm"), `#!/usr/bin/env node
const fs = require("node:fs");
const script = process.argv[3];
fs.appendFileSync(process.env.CRM_BUILD_TEST_LOG, JSON.stringify(script) + "\\n");
process.exit(script === "db:deploy" ? Number(process.env.CRM_BUILD_TEST_MIGRATION_EXIT || 0) : 0);
`, { mode: 0o755 });
    const result = spawnSync(process.execPath, [buildScript], {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "",
        AUTH_SECRET: "",
        PUBLIC_DEMO_ENABLED: "",
        VERCEL_ENV: "",
        CRM_BUILD_TEST_MIGRATION_EXIT: "0",
        ...environment,
        CRM_BUILD_TEST_LOG: log,
        PATH: `${directory}${path.delimiter}${process.env.PATH}`,
      },
    });
    let commands: string[] = [];
    try { commands = readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return { ...result, commands };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("a production build applies database migrations before compiling", () => {
  const result = build({ VERCEL_ENV: "production", DATABASE_URL: "postgresql://test@localhost/test" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, ["db:deploy", "build"]);
});

test("a failed production migration prevents the app build", () => {
  const result = build({ VERCEL_ENV: "production", DATABASE_URL: "postgresql://test@localhost/test", CRM_BUILD_TEST_MIGRATION_EXIT: "17" });
  assert.equal(result.status, 17, result.stderr);
  assert.deepEqual(result.commands, ["db:deploy"]);
});

test("preview builds do not apply migrations even with a database configured", () => {
  const result = build({ VERCEL_ENV: "preview", DATABASE_URL: "postgresql://test@localhost/test" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, ["build"]);
});

test("production refuses to enable the public demo without its required configuration", () => {
  const result = build({ VERCEL_ENV: "production", PUBLIC_DEMO_ENABLED: "true" });
  assert.equal(result.status, 1);
  assert.deepEqual(result.commands, []);
  assert.match(result.stderr, /requires DATABASE_URL and AUTH_SECRET/);
});

test("production without a database keeps the existing static preview mode", () => {
  const result = build({ VERCEL_ENV: "production" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.commands, ["build"]);
});
